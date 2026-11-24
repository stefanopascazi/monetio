// bank_link_states (migration 0044) against a real database, each test in a rolled-back transaction.
// Run on the local stack: npm run test:db. Skipped everywhere else (see localTestDbUrl).
import postgres, { type Sql, type TransactionSql } from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { cleanUrl, sslFor } from "../../scripts/db/ssl.ts";
import { localTestDbUrl } from "./local-db.ts";

const url = localTestDbUrl(process.env);
const sql: Sql | null = url ? postgres(cleanUrl(url), { ssl: sslFor(url), max: 1, onnotice: () => {} }) : null;
afterAll(async () => {
  await sql?.end();
});

class Rollback extends Error {}
const SEALED = "v1.a.b.c";

interface Fixture {
  tx: TransactionSql;
  hh: string;
  user: string;
  /** Account linked to a bank account of a consent with the given fields. */
  linked: (consent?: Record<string, unknown>, bank?: Record<string, unknown>, account?: Record<string, unknown>) => Promise<string>;
  /** States as `user` (a household member) reads them. */
  states: (as?: string) => Promise<{ account_id: string; consent_active: boolean; failing: boolean; last_synced_at: Date | null }[]>;
}

async function withHousehold(fn: (f: Fixture) => Promise<void>) {
  await sql!
    .begin(async (tx) => {
      const [{ id: user }] = await tx<{ id: string }[]>`select id from auth.users limit 1`;
      const [{ id: hh }] = await tx<{ id: string }[]>`insert into households (name) values ('Test banca') returning id`;
      await tx`insert into household_members (household_id, display_name, role, user_id) values (${hh}, 'Admin', 'admin', ${user})`;
      const f: Fixture = {
        tx,
        hh,
        user,
        linked: async (consent = {}, bank = {}, account = {}) => {
          const [{ id: acc }] = await tx<{ id: string }[]>`insert into accounts ${tx({ household_id: hh, name: "Conto", ...account })} returning id`;
          const [{ id: conn }] = await tx<{ id: string }[]>`
            insert into bank_connections ${tx({ user_id: user, household_id: hh, aspsp_name: "BCC", aspsp_country: "IT", session_id_sealed: SEALED, valid_until: new Date(Date.now() + 86_400_000), ...consent } as never)}
            returning id`;
          await tx`insert into bank_accounts ${tx({ connection_id: conn, uid: acc, account_id: acc, sync_confirmed_at: new Date(), last_synced_at: new Date(), ...bank } as never)}`;
          return acc;
        },
        states: async (as = user) => {
          await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: as, role: "authenticated" })}, true)`;
          await tx`select set_config('request.jwt.claim.sub', ${as}, true)`;
          await tx`set local role authenticated`;
          const rows = await tx`select * from bank_link_states(${hh})`;
          await tx`reset role`;
          return rows as never;
        },
      };
      await fn(f);
      throw new Rollback();
    })
    .catch((e) => {
      if (!(e instanceof Rollback)) throw e;
    });
}

describe.skipIf(!sql)("bank_link_states", () => {
  it("flags active, expired and failing links of confirmed, visible accounts", async () => {
    await withHousehold(async ({ linked, states }) => {
      const ok = await linked();
      const expired = await linked({ status: "expired" });
      const ended = await linked({ valid_until: new Date(Date.now() - 1000) });
      const failing = await linked({}, { last_error: "HTTP 500" });
      await linked({}, { sync_confirmed_at: null });
      await linked({}, {}, { archived_at: new Date() });
      const rows = Object.fromEntries((await states()).map((r) => [r.account_id, [r.consent_active, r.failing]]));
      expect(rows).toEqual({ [ok]: [true, false], [expired]: [false, false], [ended]: [false, false], [failing]: [true, true] });
    });
  });

  it("returns nothing to someone outside the household", async () => {
    await withHousehold(async ({ tx, linked, states }) => {
      await linked();
      const [{ id: outsider }] = await tx<{ id: string }[]>`
        insert into auth.users (id, email) values (gen_random_uuid(), 'fuori@example.com') returning id`;
      expect(await states(outsider)).toEqual([]);
    });
  });
});
