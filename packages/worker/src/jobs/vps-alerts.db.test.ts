// VPS alert store (migration 0047) against a real database, in rolled-back transactions.
// Run on the local stack: npm run test:db. Skipped everywhere else (see localTestDbUrl).
import postgres, { type Sql, type TransactionSql } from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { cleanUrl, sslFor } from "../../../../scripts/db/ssl.ts";
import { createPostgresVpsAlertStore } from "./vps-alerts.ts";
import { evaluateAlerts } from "../metrics/alerts.ts";
import { localTestDbUrl } from "../../../../supabase/tests/local-db.ts";

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

/** Minute samples from `fromMin` to `toMin` minutes ago with the given disk usage (of 100 bytes). */
async function samples(tx: TransactionSql, fromMin: number, toMin: number, diskUsed: number, startedAt = "2026-11-24T00:00:00Z") {
  await tx`
    insert into vps_metrics (sampled_at, cpu_pct, load1, load5, load15, mem_total_bytes, mem_used_bytes, swap_total_bytes, swap_used_bytes,
                             disk_total_bytes, disk_used_bytes, net_rx_bytes, net_tx_bytes, uptime_s, worker_rss_bytes, worker_started_at, worker_release)
    select now() - make_interval(mins => m), 5, 0.1, 0.1, 0.1, 100, 50, 100, 3, 100, ${diskUsed}, 10, 10, 100000 - m * 60, 1, ${startedAt}, 'r1'
    from generate_series(${toMin}::int, ${fromMin}::int) m`;
}

describe.skipIf(!sql)("vps alerts store", () => {
  it("opens, keeps and resolves a disk alert and pushes to sysadmins", async () => {
    await withSysadmin(async (tx, _as, admin) => {
      const store = createPostgresVpsAlertStore(tx);
      await samples(tx, 20, 0, 90);
      const tick = async () => {
        const loaded = await store.load(new Date());
        return store.apply(evaluateAlerts({ ...loaded, now: new Date() }), loaded.settings);
      };
      expect(await tick()).toBe(1);
      const [open] = await tx`select kind, details from vps_alerts where resolved_at is null`;
      expect(open).toMatchObject({ kind: "disk_high", details: { value: 90, threshold: 85 } });
      const [push] = await tx`select user_id, kind, title, url from push_outbox where kind = 'vps_alert'`;
      expect(push).toMatchObject({ user_id: admin, title: "VPS: Disco quasi pieno", url: "/notifiche" });

      // Still above: kept, no new push.
      expect(await tick()).toBe(0);
      // Back under the hysteresis band: resolved with a push.
      await tx`delete from vps_metrics`;
      await samples(tx, 20, 0, 50);
      expect(await tick()).toBe(1);
      const [{ n }] = await tx`select count(*)::int as n from vps_alerts where kind = 'disk_high' and resolved_at is not null`;
      expect(n).toBe(1);
    });
  });

  it("records a silence once after the bookmark and skips pushes when disabled", async () => {
    await withSysadmin(async (tx) => {
      await tx`update vps_alert_settings set push_enabled = false`;
      const store = createPostgresVpsAlertStore(tx);
      await samples(tx, 60, 40, 50);
      await tx`update vps_alert_state set evaluated_until = now() - interval '40 minutes'`;
      await samples(tx, 3, 0, 50);
      const loaded = await store.load(new Date());
      const decision = evaluateAlerts({ ...loaded, now: new Date() });
      expect(decision.events.map((e) => e.kind)).toEqual(["silence"]);
      expect(await store.apply(decision, loaded.settings)).toBe(0);
      const again = await store.load(new Date());
      expect(evaluateAlerts({ ...again, now: new Date() }).events).toEqual([]);
      const [{ n }] = await tx`select count(*)::int as n from push_outbox where kind = 'vps_alert'`;
      expect(n).toBe(0);
    });
  });
});

