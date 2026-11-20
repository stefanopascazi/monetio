// Integrity checks (migration 0039) against a real database, each test in a rolled-back transaction.
// Run on the local stack: npm run test:db. Skipped everywhere else (see localTestDbUrl).
import { randomUUID } from "node:crypto";
import postgres, { type Sql, type TransactionSql } from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { cleanUrl, sslFor } from "../../scripts/db/ssl.ts";
import { localTestDbUrl } from "./local-db.ts";

const url = localTestDbUrl(process.env);
// Connects to the vetted local URL only, never to whatever connect() would pick from the environment.
const sql: Sql | null = url ? postgres(cleanUrl(url), { ssl: sslFor(url), max: 1, onnotice: () => {} }) : null;
afterAll(async () => {
  await sql?.end();
});

class Rollback extends Error {}

interface Fixture {
  tx: TransactionSql;
  hh: string;
  acc: (name?: string, extra?: Record<string, unknown>) => Promise<string>;
  tr: (row: Record<string, unknown>) => Promise<string>;
  findings: (check?: string) => Promise<{ check: string; subject: string; details: Record<string, unknown> }[]>;
}

/** Runs `fn` on a fresh household inside a transaction that is always rolled back. */
async function withHousehold(fn: (f: Fixture) => Promise<void>) {
  await sql!
    .begin(async (tx) => {
      const [{ id: hh }] = await tx<{ id: string }[]>`insert into households (name) values ('Test integrità') returning id`;
      await tx`insert into household_members (household_id, display_name, role, user_id)
               values (${hh}, 'Admin', 'admin', (select id from auth.users limit 1))`;
      const f: Fixture = {
        tx,
        hh,
        acc: async (name = "Conto", extra = {}) => {
          const [row] = await tx<{ id: string }[]>`insert into accounts ${tx({ household_id: hh, name, ...extra })} returning id`;
          return row.id;
        },
        tr: async (row) => {
          const base = { household_id: hh, kind: "expense", amount_cents: -1000, booked_on: "2026-10-05", description: "x" };
          const [r] = await tx<{ id: string }[]>`insert into transactions ${tx({ ...base, ...row } as never)} returning id`;
          return r.id;
        },
        findings: async (check) =>
          (await tx`select "check", subject, details from integrity_findings() where household_id = ${hh}`).filter(
            (r) => !check || r.check === check,
          ) as never,
      };
      await fn(f);
      throw new Rollback();
    })
    .catch((e) => {
      if (!(e instanceof Rollback)) throw e;
    });
}

describe.skipIf(!sql)("integrity checks", () => {
  it("finds nothing on clean data", async () => {
    await withHousehold(async ({ acc, tr, findings }) => {
      const a = await acc("A");
      const b = await acc("B");
      const g = randomUUID();
      await tr({ account_id: a, kind: "transfer", counterpart_account_id: b, transfer_group_id: g, amount_cents: -500 });
      await tr({ account_id: b, kind: "transfer", counterpart_account_id: a, transfer_group_id: g, amount_cents: 500 });
      await tr({ account_id: a });
      expect(await findings()).toEqual([]);
    });
  });

  it("rule_double_booking: a monthly rule booked twice in one month", async () => {
    await withHousehold(async ({ tx, hh, acc, tr, findings }) => {
      const a = await acc();
      const [{ id: rule }] = await tx<{ id: string }[]>`
        insert into recurring_rules (household_id, account_id, kind, description, amount_cents, start_date)
        values (${hh}, ${a}, 'expense', 'Affitto', -1000, '2026-01-01') returning id`;
      const t1 = await tr({ account_id: a, recurring_rule_id: rule, occurrence_date: "2026-10-01", source: "rule" });
      const t2 = await tr({ account_id: a, recurring_rule_id: rule, occurrence_date: "2026-10-15", source: "rule" });
      await tr({ account_id: a, recurring_rule_id: rule, occurrence_date: "2026-11-01", source: "rule" });
      const [f] = await findings("rule_double_booking");
      expect(f.details).toMatchObject({ rule_id: rule, rule_type: "recurring", month: "2026-10", transaction_ids: [t1, t2] });
      expect(await findings("rule_double_booking")).toHaveLength(1);
    });
  });

  it("rule_double_booking: weekly rules are skipped", async () => {
    await withHousehold(async ({ tx, hh, acc, tr, findings }) => {
      const a = await acc();
      const [{ id: rule }] = await tx<{ id: string }[]>`
        insert into recurring_rules (household_id, account_id, kind, description, amount_cents, start_date, frequency)
        values (${hh}, ${a}, 'expense', 'Spesa', -1000, '2026-01-01', 'weekly') returning id`;
      await tr({ account_id: a, recurring_rule_id: rule, occurrence_date: "2026-10-01" });
      await tr({ account_id: a, recurring_rule_id: rule, occurrence_date: "2026-10-08" });
      expect(await findings("rule_double_booking")).toEqual([]);
    });
  });

  it("ignores unlinked and one-sided transfers: household data choices, not platform anomalies", async () => {
    await withHousehold(async ({ acc, tr, findings }) => {
      const a = await acc("A");
      const b = await acc("B");
      await tr({ account_id: a, kind: "transfer", counterpart_account_id: b, amount_cents: -500 });
      await tr({ account_id: b, kind: "transfer", counterpart_account_id: a, amount_cents: 500 });
      await tr({ account_id: a, kind: "transfer", counterpart_account_id: b, amount_cents: -700, booked_on: "2026-10-09" });
      expect(await findings()).toEqual([]);
    });
  });

  it("transfer_mismatch: linked sides with different amounts or a lone side in a group", async () => {
    await withHousehold(async ({ acc, tr, findings }) => {
      const a = await acc("A");
      const b = await acc("B");
      const g1 = randomUUID();
      await tr({ account_id: a, kind: "transfer", counterpart_account_id: b, transfer_group_id: g1, amount_cents: -500 });
      await tr({ account_id: b, kind: "transfer", counterpart_account_id: a, transfer_group_id: g1, amount_cents: 400 });
      const g2 = randomUUID();
      await tr({ account_id: a, kind: "transfer", counterpart_account_id: b, transfer_group_id: g2, amount_cents: -300 });
      const subjects = (await findings("transfer_mismatch")).map((f) => f.subject).sort();
      expect(subjects).toEqual([g1, g2].sort());
    });
  });

  it("orphan_movement: planned movement of a deleted rule and planned movement on an archived account", async () => {
    await withHousehold(async ({ acc, tr, findings }) => {
      const a = await acc("A");
      const archived = await acc("Chiuso", { archived_at: new Date().toISOString() });
      const fromRule = await tr({ account_id: a, status: "planned", source: "rule", booked_on: "2026-12-01" });
      const onArchived = await tr({ account_id: archived, status: "planned", booked_on: "2026-12-01" });
      await tr({ account_id: archived, status: "booked" });
      const found = Object.fromEntries((await findings("orphan_movement")).map((f) => [f.subject, f.details.reason]));
      expect(found).toEqual({ [fromRule]: "planned_rule_deleted", [onArchived]: "planned_on_archived_account" });
    });
  });

  it("orphan_movement: category of another household", async () => {
    await withHousehold(async ({ tx, acc, tr, findings }) => {
      const a = await acc();
      const [{ id: other }] = await tx<{ id: string }[]>`insert into households (name) values ('Altro') returning id`;
      const [{ id: cat }] = await tx<{ id: string }[]>`insert into categories (household_id, name) values (${other}, 'Estranea') returning id`;
      const t = await tr({ account_id: a, category_id: cat });
      expect(await findings("orphan_movement")).toEqual([expect.objectContaining({ subject: t, details: expect.objectContaining({ reason: "category_other_household" }) })]);
    });
  });

  it("household_without_admin: no admin linked to an account", async () => {
    await withHousehold(async ({ tx, hh, findings }) => {
      expect(await findings("household_without_admin")).toEqual([]);
      await tx`update household_members set role = 'member' where household_id = ${hh}`;
      expect(await findings("household_without_admin")).toEqual([expect.objectContaining({ subject: hh, details: { members: 1, linked_members: 1 } })]);
    });
  });

  it("balance_drift: monthly totals out of step with the movements", async () => {
    await withHousehold(async ({ tx, acc, tr, findings }) => {
      const a = await acc();
      await tr({ account_id: a, booked_on: "2026-10-05" });
      expect(await findings("balance_drift")).toEqual([]);
      await tx`update monthly_totals set total_cents = total_cents + 1 where account_id = ${a}`;
      expect(await findings("balance_drift")).toEqual([expect.objectContaining({ subject: `${a}:2026-10`, details: { account_id: a, month: "2026-10", buckets: 1 } })]);
    });
  });

  it("admin_request_job / admin_integrity: sysadmins only, one pending request, audit-logged", async () => {
    await withHousehold(async ({ tx }) => {
      const [{ id: user }] = await tx<{ id: string }[]>`select id from auth.users limit 1`;
      await tx`delete from admin_job_requests where job = 'integrity-check' and finished_at is null`;
      const actAs = async () => {
        await tx`set local role authenticated`;
        await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: user, role: "authenticated" })}, true)`;
      };
      await tx`savepoint s`;
      await actAs();
      await expect(tx`select admin_integrity()`).rejects.toThrow("not a sysadmin");
      await tx`rollback to savepoint s`;
      await tx`insert into sysadmins (user_id) values (${user}) on conflict do nothing`;
      await actAs();
      const [{ id: first }] = await tx`select admin_request_job('integrity-check') as id`;
      const [{ id: again }] = await tx`select admin_request_job('integrity-check') as id`;
      expect(again).toBe(first);
      const [{ v }] = await tx`select admin_integrity() as v`;
      expect(v.pending_request).not.toBeNull();
      await tx`reset role`;
      // at = now(): only rows written in this transaction, whatever the local log already holds.
      const logs = await tx`select action, target from admin_audit_log where details->>'request_id' = ${String(first)} and at = now()`;
      expect(logs).toEqual([{ action: "job.request", target: "integrity-check" }]);
    });
  });

  it("run_integrity_checks: opens, refreshes and resolves anomalies", async () => {
    await withHousehold(async ({ tx, hh, acc, findings }) => {
      await tx`update household_members set role = 'member' where household_id = ${hh}`;
      expect(await findings()).toHaveLength(1);
      const [{ totals }] = await tx`select run_integrity_checks() as totals`;
      expect(totals.household_without_admin).toBeGreaterThanOrEqual(1);
      const open = async () => (await tx`select resolved_at from integrity_anomalies where "check" = 'household_without_admin' and subject = ${hh}`)[0];
      expect((await open()).resolved_at).toBeNull();
      await tx`update household_members set role = 'admin' where household_id = ${hh}`;
      await tx`select run_integrity_checks()`;
      expect((await open()).resolved_at).not.toBeNull();
      await acc();
    });
  });
});
