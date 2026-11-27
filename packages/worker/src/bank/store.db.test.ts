// Bank sync store (migration 0048: inferred movements) against a real database, in rolled-back transactions.
// Run on the local stack: npm run test:db. Skipped everywhere else (see localTestDbUrl).
import postgres, { type Sql, type TransactionSql } from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { cleanUrl, sslFor } from "../../../../scripts/db/ssl.ts";
import { localTestDbUrl } from "../../../../supabase/tests/local-db.ts";
import { createPostgresBankSyncStore } from "./store.ts";

const url = localTestDbUrl(process.env);
const sql: Sql | null = url ? postgres(cleanUrl(url), { ssl: sslFor(url), max: 1, onnotice: () => {} }) : null;
afterAll(async () => {
  await sql?.end();
});

class Rollback extends Error {}

/** Fresh household with one account and two categories, always rolled back. */
async function withAccount(fn: (tx: TransactionSql, f: { hh: string; acc: string; auto: string; extra: string }) => Promise<void>) {
  await sql!
    .begin(async (tx) => {
      const [{ id: hh }] = await tx<{ id: string }[]>`insert into households (name) values ('Test inferenza') returning id`;
      const [{ id: acc }] = await tx<{ id: string }[]>`insert into accounts (household_id, name) values (${hh}, 'Trade') returning id`;
      const [{ id: auto }] = await tx<{ id: string }[]>`insert into categories (household_id, name, kind) values (${hh}, 'Auto', 'expense') returning id`;
      const [{ id: extra }] = await tx<{ id: string }[]>`insert into categories (household_id, name, kind) values (${hh}, 'Extra', 'expense') returning id`;
      await fn(tx, { hh, acc, auto, extra });
      throw new Rollback();
    })
    .catch((e) => {
      if (!(e instanceof Rollback)) throw e;
    });
}

describe.skipIf(!sql)("bank sync store execution dates", () => {
  it("reads the booked balance and stores the pending ledger", async () => {
    await withAccount(async (tx, { hh, acc }) => {
      await tx`update accounts set opening_balance_cents = 5223 where id = ${acc}`;
      await tx`insert into transactions (household_id, account_id, kind, status, source, amount_cents, booked_on, description)
        values (${hh}, ${acc}, 'income', 'booked', 'manual', 3176, '2026-11-20', 'x'), (${hh}, ${acc}, 'expense', 'planned', 'manual', -999, '2026-11-30', 'y')`;
      const store = createPostgresBankSyncStore(tx as unknown as Sql);
      expect(await store.loadBookedBalance!(acc)).toBe(8399);

      const [{ id: user }] = await tx<{ id: string }[]>`select id from auth.users limit 1`;
      const [{ id: conn }] = await tx<{ id: string }[]>`
        insert into bank_connections (user_id, household_id, aspsp_name, aspsp_country, session_id_sealed, valid_until)
        values (${user}, ${hh}, 'Trade Republic', 'DE', 'v1.a.b.c', now() + interval '1 day') returning id`;
      const [{ id: ba }] = await tx<{ id: string }[]>`insert into bank_accounts (connection_id, uid, account_id) values (${conn}, ${acc}, ${acc}) returning id`;
      const ledger = { offsetCents: 0, entries: [{ on: "2026-11-27" as const, amountCents: -160 }] };
      await store.saveStatus(ba, { syncedAt: new Date(), balance: null, available: { cents: 8239, date: null }, pending: [], ledger, error: null });
      const [row] = await tx`select pending_ledger from bank_accounts where id = ${ba}`;
      expect(row.pending_ledger).toEqual(ledger);
    });
  });
});

describe.skipIf(!sql)("bank sync store inference history", () => {
  it("returns only categorised movements set by people with the requested amounts", async () => {
    await withAccount(async (tx, { hh, acc, auto, extra }) => {
      const row = (amount: number, description: string, extraFields: Record<string, unknown> = {}) => ({
        household_id: hh,
        account_id: acc,
        kind: "expense",
        status: "booked",
        source: "manual",
        amount_cents: amount,
        booked_on: "2026-11-20",
        description,
        category_id: auto,
        // Multi-row inserts take their columns from the first row: every row lists them all.
        inferred_from: null,
        ...extraFields,
      });
      await tx`insert into transactions ${tx([
        row(-160, "Autostrada"),
        row(-160, "Autostrada", { booked_on: "2025-01-01" }),
        row(-160, "Movimento bancario", { category_id: extra, source: "bank" }),
        row(-160, "Autostrada", { inferred_from: 3, source: "bank" }),
        row(-160, "Senza categoria", { category_id: null }),
        row(-220, "Autostrada"),
      ] as never)}`;
      const history = await createPostgresBankSyncStore(tx as unknown as Sql).loadInferenceHistory!(acc, [-160, -1000], "2025-11-01");
      expect(history).toEqual([{ bookedOn: "2026-11-20", amountCents: -160, description: "Autostrada", categoryId: auto }]);
    });
  });

  it("rejects a non-positive inferred count", async () => {
    await withAccount(async (tx, { hh, acc }) => {
      await expect(
        tx.savepoint((sp) => sp`insert into transactions (household_id, account_id, kind, status, source, amount_cents, booked_on, description, inferred_from)
          values (${hh}, ${acc}, 'expense', 'booked', 'bank', -160, '2026-11-20', 'x', 0)`),
      ).rejects.toThrow(/check/);
    });
  });
});
