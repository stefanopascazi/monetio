// VPS alert console RPCs (migration 0047) against a real database, in rolled-back transactions.
// The worker store is tested in packages/worker/src/jobs/vps-alerts.db.test.ts.
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

/** Runs `fn` with a fresh sysadmin and empty VPS tables, always rolled back. */
async function withSysadmin(fn: (tx: TransactionSql, as: (user: string) => Promise<void>, admin: string) => Promise<void>) {
  await sql!
    .begin(async (tx) => {
      const [{ id: admin }] = await tx<{ id: string }[]>`insert into auth.users (id, email) values (gen_random_uuid(), 'admin@example.com') returning id`;
      await tx`delete from sysadmins`;
      await tx`insert into sysadmins (user_id) values (${admin})`;
      await tx`delete from vps_metrics`;
      await tx`delete from vps_metrics_hourly`;
      await tx`delete from vps_alerts`;
      await tx`update vps_alert_state set evaluated_until = null where id`;
      await tx`delete from vps_alert_settings`;
      await tx`insert into vps_alert_settings default values`;
      await tx`delete from push_outbox where kind = 'vps_alert'`;
      const as = async (user: string) => {
        await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: user, role: "authenticated" })}, true)`;
        await tx`select set_config('request.jwt.claim.sub', ${user}, true)`;
        await tx`set local role authenticated`;
      };
      await fn(tx, as, admin);
      throw new Rollback();
    })
    .catch((e) => {
      if (!(e instanceof Rollback)) throw e;
    });
}

describe.skipIf(!sql)("vps alerts console", () => {
  it("reads settings, open and recent alerts, and updates thresholds with an audit entry", async () => {
    await withSysadmin(async (tx, as, admin) => {
      await tx`insert into vps_alerts (kind, details) values ('ram_high', '{"value": 95}')`;
      await tx`insert into vps_alerts (kind, opened_at, last_seen_at, resolved_at) values ('worker_restart', now() - interval '1 hour', now() - interval '1 hour', now() - interval '1 hour')`;
      await as(admin);
      const [{ v }] = await tx`select admin_vps_alerts() as v`;
      expect(v.settings).toMatchObject({ ram_pct: 90, disk_pct: 85, push_enabled: true });
      expect(v.settings.updated_by).toBeUndefined();
      expect(v.settings.updated_at).toBeNull();
      expect(v.open.map((a: { kind: string }) => a.kind)).toEqual(["ram_high"]);
      expect(v.recent.map((a: { kind: string }) => a.kind)).toEqual(["worker_restart"]);

      await tx`select admin_set_vps_alert_settings('{"disk_pct": 80, "push_enabled": false}')`;
      const [{ v: after }] = await tx`select admin_vps_alerts() as v`;
      expect(after.settings).toMatchObject({ disk_pct: 80, push_enabled: false, ram_pct: 90 });
      expect(after.settings.updated_at).not.toBeNull();
      await expect(tx`select admin_set_vps_alert_settings('{"disk_pct": 5}')`.execute()).rejects.toThrow(/check/);
    });
    await withSysadmin(async (tx, as, admin) => {
      await as(admin);
      await expect(tx`select admin_set_vps_alert_settings('{"nope": 1}')`.execute()).rejects.toThrow(/unknown setting/);
    });
    await withSysadmin(async (tx, as, admin) => {
      await as(admin);
      await tx`select admin_set_vps_alert_settings('{"cpu_pct": 80}')`;
      await tx`reset role`;
      const [{ n }] = await tx`select count(*)::int as n from admin_audit_log where action = 'vps.settings' and actor = ${admin}`;
      expect(n).toBe(1);
    });
  });

  it("refuses non-sysadmins", async () => {
    await withSysadmin(async (tx, as) => {
      const [{ id: user }] = await tx<{ id: string }[]>`insert into auth.users (id, email) values (gen_random_uuid(), 'utente@example.com') returning id`;
      await as(user);
      await expect(tx`select admin_vps_alerts()`.execute()).rejects.toThrow(/not a sysadmin/);
    });
    await withSysadmin(async (tx, as) => {
      const [{ id: user }] = await tx<{ id: string }[]>`insert into auth.users (id, email) values (gen_random_uuid(), 'utente@example.com') returning id`;
      await as(user);
      await expect(tx`select admin_set_vps_alert_settings('{}')`.execute()).rejects.toThrow(/not a sysadmin/);
    });
  });
});
