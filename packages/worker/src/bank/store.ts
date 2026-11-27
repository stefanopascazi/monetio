import type { Sql } from "postgres";
import { GENERIC_BANK_DESCRIPTION } from "../../../../lib/import/matches.ts";
import type { Decision } from "../../../../lib/banking/sync/match.ts";
import type { SyncStore, SyncTarget } from "../../../../lib/banking/sync/run.ts";
import { mapCategory } from "../../../../lib/data/mappers.ts";
import type { ISODate } from "../../../../lib/domain/types.ts";

/** `syncSlots`: daily slots the bank allows (null = all), learned from its read limit (#112). */
export type BankSyncTarget = SyncTarget & { appId: string; privateKeySealed: string; syncSlots: number | null };

export interface BankSyncStore extends SyncStore {
  /** Active consents past their end become "expired"; returns how many. */
  expireConnections(now: Date): Promise<number>;
  /** Linked bank accounts of active consents whose owner still has an app and confirmed the preview. */
  listTargets(): Promise<BankSyncTarget[]>;
  /** Stores how many daily slots the bank allows and clears the read-limit error. */
  limitSyncSlots(bankAccountId: string, slots: number): Promise<void>;
}

const iso = (d: Date | string) => (typeof d === "string" ? d : d.toISOString()).slice(0, 10) as ISODate;

export function createPostgresBankSyncStore(sql: Sql): BankSyncStore {
  return {
    async expireConnections(now) {
      const rows = await sql`update bank_connections set status = 'expired' where status = 'active' and valid_until <= ${now} returning id`;
      return rows.length;
    },

    async listTargets() {
      const rows = await sql`
        select ba.id as bank_account_id, ba.uid, c.user_id, c.household_id, ba.account_id, a.opening_date, ba.sync_from,
               ba.last_synced_at, c.created_at as connection_created_at, cr.app_id, cr.private_key_sealed, ba.sync_slots
        from bank_accounts ba
        join bank_connections c on c.id = ba.connection_id
        join accounts a on a.id = ba.account_id and a.household_id = c.household_id
        join bank_credentials cr on cr.user_id = c.user_id
        where c.status = 'active' and c.valid_until > now() and a.archived_at is null and ba.sync_confirmed_at is not null
        order by c.user_id, ba.id`;
      return rows.map((r) => ({
        bankAccountId: r.bank_account_id,
        uid: r.uid,
        userId: r.user_id,
        householdId: r.household_id,
        accountId: r.account_id,
        openingDate: iso(r.opening_date),
        syncFrom: r.sync_from ? iso(r.sync_from) : null,
        lastSyncedAt: r.last_synced_at ? new Date(r.last_synced_at) : null,
        connectionCreatedAt: new Date(r.connection_created_at),
        appId: r.app_id,
        privateKeySealed: r.private_key_sealed,
        syncSlots: r.sync_slots == null ? null : Number(r.sync_slots),
      }));
    },

    async limitSyncSlots(bankAccountId, slots) {
      await sql`update bank_accounts set sync_slots = ${slots}, last_error = null where id = ${bankAccountId}`;
    },

    async loadExisting(accountId, from) {
      const [txns, reviews] = await Promise.all([
        sql`
          select id, booked_on, amount_cents, description, coalesce(bank_ref, bank_batch_ref) as bank_ref, counterpart_account_id,
                 (recurring_rule_id is not null or contribution_rule_id is not null) as from_rule
          from transactions
          where account_id = ${accountId} and booked_on >= ${from} and parent_transaction_id is null`,
        sql`select bank_ref from bank_sync_reviews where account_id = ${accountId}`,
      ]);
      return {
        candidates: txns.map((t) => ({
          id: t.id,
          bookedOn: iso(t.booked_on),
          amountCents: Number(t.amount_cents),
          description: t.description,
          fromRule: t.from_rule,
          bankRef: t.bank_ref,
          counterpartId: t.counterpart_account_id,
        })),
        reviewRefs: reviews.map((r) => r.bank_ref),
      };
    },

    async loadCategoryHints(target) {
      // Matches the users chose for this account (#91).
      const [matches, categories] = await Promise.all([
        sql`select description_key, direction, category_id from account_category_matches where account_id = ${target.accountId}`,
        sql`select * from categories where household_id = ${target.householdId}`,
      ]);
      return {
        matches: matches.map((r) => ({ key: r.description_key, direction: Number(r.direction) as 1 | -1, categoryId: r.category_id })),
        categories: categories.map(mapCategory),
      };
    },

    async loadInferenceHistory(accountId, amounts, from) {
      // Evidence set by people only: no rule bookings, no other inferred or detail-less movement.
      const rows = await sql`
        select booked_on, amount_cents, description, category_id
        from transactions
        where account_id = ${accountId} and booked_on >= ${from} and amount_cents in ${sql(amounts)}
          and parent_transaction_id is null and kind in ('income', 'expense') and category_id is not null
          and recurring_rule_id is null and contribution_rule_id is null and inferred_from is null
          and description <> ${GENERIC_BANK_DESCRIPTION}`;
      return rows.map((r) => ({ bookedOn: iso(r.booked_on), amountCents: Number(r.amount_cents), description: r.description, categoryId: r.category_id }));
    },

    async apply(target: SyncTarget, decisions: Decision[]) {
      // All decisions of one account land together or not at all, recorded as one undoable batch (#88).
      await sql.begin(async (tx) => {
        const [{ id: batch }] = await tx`select open_bank_sync_batch(${target.bankAccountId}, 'worker') as id`;
        const counts = { inserted: 0, reconciled: 0, review: 0 };
        for (const d of decisions) {
          const m = d.movement;
          if (d.type === "insert") {
            const rows = await tx`
              insert into transactions (household_id, account_id, kind, status, source, amount_cents, booked_on, description, bank_ref, category_id, bank_sync_batch_id, inferred_from)
              values (${target.householdId}, ${target.accountId}, ${m.amountCents >= 0 ? "income" : "expense"}, 'booked', 'bank',
                      ${m.amountCents}, ${m.bookedOn}, ${d.inferred?.description ?? m.description}, ${m.ref}, ${d.categoryId ?? null}, ${batch},
                      ${d.inferred?.count ?? null})
              on conflict (account_id, bank_ref) where bank_ref is not null do nothing
              returning id`;
            counts.inserted += rows.length;
          } else if (d.type === "reconcile") {
            // Shared with confirm_bank_sync: planned rows become booked, batches share the reference.
            const [{ n }] = await tx`select reconcile_bank_rows(${target.accountId}, ${d.transactionIds}::uuid[], ${m.ref}, ${m.bookedOn}, ${batch}) as n`;
            if (Number(n) > 0) counts.reconciled++;
          } else if (d.type === "review") {
            const rows = await tx`
              insert into bank_sync_reviews (household_id, account_id, bank_ref, booked_on, amount_cents, description, reason, candidate_transaction_id, batch_id)
              values (${target.householdId}, ${target.accountId}, ${m.ref}, ${m.bookedOn}, ${m.amountCents}, ${m.description}, ${d.reason}, ${d.candidateId}, ${batch})
              on conflict (account_id, bank_ref) do nothing
              returning id`;
            counts.review += rows.length;
          }
        }
        await tx`select close_bank_sync_batch(${batch}, ${counts.inserted}, ${counts.reconciled}, ${counts.review})`;
      });
    },

    async saveStatus(bankAccountId, { syncedAt, balance, available, pending, error }) {
      if (error) {
        await sql`update bank_accounts set last_error = ${error.slice(0, 300)} where id = ${bankAccountId}`;
        return;
      }
      await sql`
        update bank_accounts set last_synced_at = ${syncedAt}, last_error = null,
          bank_balance_cents = ${balance?.cents ?? null}, bank_balance_on = ${balance?.date ?? null},
          bank_available_cents = ${available?.cents ?? null},
          pending_movements = ${pending ? sql.json(pending) : null}
        where id = ${bankAccountId}`;
    },
  };
}
