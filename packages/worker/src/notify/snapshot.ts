// Loads what a user sees of a household, as that user: queries run with role `authenticated` and the
// user's JWT claims, so RLS applies exactly as in the app. Rows come back through json_agg, the same
// shape PostgREST returns (bigint as JSON numbers), and go through the app's own mappers.
import type { Sql, TransactionSql } from "postgres";
import { addDays, endOfMonth, monthKey, startOfMonth } from "../../../../lib/domain/dates.ts";
import type { EstimateMovement } from "../../../../lib/domain/estimates.ts";
import { withPendingStart } from "../../../../lib/domain/pending.ts";
import { mapBankConnection, projectionPending } from "../../../../lib/banking/connections.ts";
import { createMatcher } from "../../../../lib/import/matches.ts";
import type { OccurrenceOverride } from "../../../../lib/domain/types.ts";
import { mapFlow } from "../../../../lib/data/flow-math.ts";
import { attachFees, mapAccount, mapCategory, mapContribution, mapRule, mapTransaction } from "../../../../lib/data/mappers.ts";
import {
  type AccountWithBalance,
  buildAgenda,
  buildProjectionInput,
  decrementCategories,
  LOOKBACK_DAYS,
  projectionFlowsSince,
} from "../../../../lib/data/projection-input.ts";
import type { EventSnapshot } from "../../../../lib/notifications/events.ts";
import { mapPrefs } from "../../../../lib/notifications/prefs.ts";

type Row = Record<string, unknown>;

export interface Recipient {
  userId: string;
  householdId: string;
  householdName: string;
  /** The user belongs to several households: notifications name this one. */
  multiHousehold: boolean;
}

/** Every signed-up member of every household. */
export async function listRecipients(sql: Sql): Promise<Recipient[]> {
  return sql<Recipient[]>`
    select m.user_id as "userId", m.household_id as "householdId", h.name as "householdName",
           count(*) over (partition by m.user_id) > 1 as "multiHousehold"
    from household_members m join households h on h.id = m.household_id
    where m.user_id is not null
    order by m.user_id, h.name`;
}

/** First row's `rows` column of a `select json_agg(...) as rows` query. */
async function rows(query: PromiseLike<readonly unknown[]>): Promise<Row[]> {
  const [first] = (await query) as readonly { rows: Row[] | null }[];
  return first?.rows ?? [];
}

/** Planned rows with their fee totals (same lookups as the app's withFees). */
async function plannedWithFees(tx: TransactionSql, householdId: string) {
  const planned = (
    await rows(
      tx`select json_agg(t order by booked_on desc, id desc) as rows from (select * from transactions where household_id = ${householdId} and status = 'planned' order by booked_on desc, id desc limit 1000) t`,
    )
  ).map(mapTransaction);
  const transfers = planned.filter((t) => t.transferGroupId && !t.parentTransactionId);
  const sides = transfers.map((t) => ({ id: t.id, groupId: t.transferGroupId! }));
  const incoming = transfers.filter((t) => t.amountCents > 0).map((t) => t.transferGroupId!);
  if (incoming.length) {
    const paying = await rows(
      tx`select json_agg(t) as rows from (select id, transfer_group_id from transactions where transfer_group_id in ${tx(incoming)} and amount_cents < 0 and parent_transaction_id is null) t`,
    );
    for (const r of paying) sides.push({ id: String(r.id), groupId: String(r.transfer_group_id) });
  }
  const ids = [...new Set([...planned.filter((t) => t.paymentMethod).map((t) => t.id), ...sides.map((s) => s.id)])];
  if (!ids.length) return planned;
  const fees = await rows(
    tx`select json_agg(t) as rows from (select parent_transaction_id, amount_cents from transactions where parent_transaction_id in ${tx(ids)}) t`,
  );
  return attachFees(
    planned,
    fees.map((r) => ({ parentId: String(r.parent_transaction_id), amountCents: Number(r.amount_cents) })),
    sides,
  );
}

/** Data the notification rules need, seen by `r.userId` in `r.householdId` on `today` (Europe/Rome). */
export async function loadSnapshot(sql: Sql, r: Recipient, today: string): Promise<EventSnapshot> {
  return sql.begin(async (tx) => {
    // Read-only impersonation, scoped to this transaction.
    await tx`select set_config('role', 'authenticated', true),
                    set_config('request.jwt.claim.sub', ${r.userId}, true),
                    set_config('request.jwt.claims', ${JSON.stringify({ sub: r.userId, role: "authenticated" })}, true)`;
    await tx`set transaction read only`;
    const hh = r.householdId;
    const since = addDays(today, -LOOKBACK_DAYS);
    const current = monthKey(today);

    const accountRows = await rows(tx`select json_agg(a order by sort_order, name) as rows from accounts a where household_id = ${hh}`);
    const balanceRows = await rows(tx`select json_agg(b) as rows from (select account_id, balance_cents from account_balances where household_id = ${hh}) b`);
    const balances = new Map(balanceRows.map((b) => [String(b.account_id), Number(b.balance_cents)]));
    const accounts: AccountWithBalance[] = accountRows.map((row) => {
      const a = mapAccount(row);
      return { ...a, balanceCents: balances.get(a.id) ?? a.openingBalanceCents };
    });

    const rules = (await rows(tx`select json_agg(r order by description) as rows from recurring_rules r where household_id = ${hh}`)).map(mapRule);
    const contributions = (await rows(tx`select json_agg(c order by description) as rows from contribution_rules c where household_id = ${hh}`)).map(
      mapContribution,
    );
    const occurrences = (
      await rows(
        tx`select json_agg(t) as rows from (select recurring_rule_id, contribution_rule_id, occurrence_date from transactions
           where household_id = ${hh} and occurrence_date >= ${since}
             and (recurring_rule_id is not null or contribution_rule_id is not null) limit 5000) t`,
      )
    ).map((o) => ({
      recurringRuleId: (o.recurring_rule_id as string | null) ?? null,
      contributionRuleId: (o.contribution_rule_id as string | null) ?? null,
      occurrenceDate: (o.occurrence_date as string | null) ?? null,
    }));
    const flows = (
      await rows(tx`select json_agg(f) as rows from monthly_flows f where household_id = ${hh} and month >= ${startOfMonth(monthKey(since))}`)
    ).map(mapFlow);
    const overrides: OccurrenceOverride[] = (
      await rows(
        tx`select json_agg(o) as rows from (select rule_id, period, amount_cents, due_date, note from rule_occurrence_overrides where household_id = ${hh}) o`,
      )
    ).map((o) => ({
      ruleId: String(o.rule_id),
      period: String(o.period),
      amountCents: Number(o.amount_cents),
      dueDate: String(o.due_date),
      note: o.note == null ? null : String(o.note),
    }));

    const agenda = buildAgenda({ today, rules, contributions, occurrences, flows, overrides });
    const planned = await plannedWithFees(tx, hh);
    const flowsFrom = startOfMonth(projectionFlowsSince(today));
    const monthFlows = flows.filter((f) => `${f.month}-01` >= flowsFrom);
    const categories = decrementCategories(rules);
    const estimateMovements: EstimateMovement[] = categories.length
      ? (
          await rows(
            tx`select json_agg(t) as rows from (select id, account_id, category_id, amount_cents, description, booked_on from transactions
               where household_id = ${hh} and status = 'booked' and skip_estimates = false and kind in ('income', 'expense')
                 and category_id in ${tx(categories)} and booked_on between ${startOfMonth(current)} and ${endOfMonth(current)} limit 5000) t`,
          )
        ).map((m) => ({
          id: String(m.id),
          accountId: String(m.account_id),
          categoryId: String(m.category_id),
          amountCents: Number(m.amount_cents),
          description: String(m.description ?? ""),
          bookedOn: String(m.booked_on),
        }))
      : [];
    const projection = buildProjectionInput(agenda, { accounts, planned, monthFlows, estimateMovements }, 1);
    // Same start as the app: pending bank money of the user's own consents (RLS), matched to what is expected.
    const pending = await loadPending(tx, hh, accounts, new Date(`${today}T12:00:00Z`));
    projection.input.balances = withPendingStart(projection.input.balances, pending.startCents);
    projection.input.pending = pending.pending;

    const activeIds = projection.active.map((a) => a.id);
    const lastRows = activeIds.length
      ? await rows(
          tx`select json_agg(t) as rows from (select account_id, max(booked_on) as last from transactions where account_id in ${tx(activeIds)} and status = 'booked' group by account_id) t`,
        )
      : [];
    const lastBooked: Record<string, string | null> = Object.fromEntries(activeIds.map((id) => [id, null]));
    for (const l of lastRows) lastBooked[String(l.account_id)] = String(l.last);

    const [prefsRow] = await rows(tx`select json_agg(p) as rows from notification_prefs p where user_id = ${r.userId}`);
    // RLS: own consents only; review items of visible accounts.
    const consents = await rows(
      tx`select json_agg(c) as rows from (select id, aspsp_name, valid_until, status from bank_connections where household_id = ${hh} and user_id = ${r.userId}) c`,
    );
    const [reviews] = await tx<{ count: number; latest: Date | null; latest_account: string | null }[]>`
      select count(*)::int as count, max(created_at) as latest,
             (array_agg(account_id order by created_at desc))[1] as latest_account
      from bank_sync_reviews where household_id = ${hh} and resolved_at is null`;

    return {
      userId: r.userId,
      householdId: hh,
      householdLabel: r.multiHousehold ? r.householdName : null,
      prefs: mapPrefs(prefsRow ?? null),
      agenda,
      projection,
      lastBooked,
      bank: {
        consents: consents.map((c) => ({ id: String(c.id), bankName: String(c.aspsp_name), validUntil: String(c.valid_until), status: String(c.status) })),
        openReviews: {
          count: reviews?.count ?? 0,
          latestAt: reviews?.latest ? new Date(reviews.latest).toISOString() : null,
          latestAccountId: reviews?.latest_account ?? null,
        },
      },
    };
  });
}

/** Pending bank money of the user's linked accounts, items categorised by the account's matches. */
async function loadPending(tx: TransactionSql, hh: string, accounts: AccountWithBalance[], now: Date) {
  const connections = (
    await rows(
      tx`select json_agg(c) as rows from (
           select c.id, c.aspsp_name, c.valid_until, c.status, c.created_at, c.last_synced_at,
                  (select json_agg(json_build_object('id', a.id, 'name', a.name, 'iban_masked', a.iban_masked, 'currency', a.currency,
                          'account_id', a.account_id, 'bank_balance_cents', a.bank_balance_cents, 'bank_available_cents', a.bank_available_cents,
                          'pending_movements', a.pending_movements, 'sync_confirmed_at', a.sync_confirmed_at))
                   from bank_accounts a where a.connection_id = c.id) as bank_accounts
           from bank_connections c where c.household_id = ${hh}) c`,
    )
  ).map((c) => mapBankConnection(c as Parameters<typeof mapBankConnection>[0]));
  const monetio = Object.fromEntries(accounts.filter((a) => !a.archived).map((a) => [a.id, a.balanceCents]));
  const listed = [...new Set(connections.flatMap((c) => c.accounts.filter((a) => a.accountId && a.pendingMovements?.length).map((a) => a.accountId as string)))];
  if (!listed.length) return projectionPending(connections, monetio, () => null, now);
  const categories = (await rows(tx`select json_agg(c) as rows from categories c where household_id = ${hh}`)).map(mapCategory);
  const matchRows = await rows(
    tx`select json_agg(m) as rows from (select account_id, description_key, direction, category_id from account_category_matches where account_id in ${tx(listed)}) m`,
  );
  const matchers = new Map(
    listed.map((id) => [
      id,
      createMatcher(
        matchRows.filter((m) => m.account_id === id).map((m) => ({ key: String(m.description_key), direction: Number(m.direction) as 1 | -1, categoryId: String(m.category_id) })),
        categories,
      ),
    ]),
  );
  return projectionPending(connections, monetio, (accountId, item) => matchers.get(accountId)?.(item.description, item.amountCents) ?? null, now);
}
