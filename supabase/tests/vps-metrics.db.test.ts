// VPS metrics, rollup and admin_vps (migration 0046) against a real database, in rolled-back transactions.
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

/** Runs `fn` with a fresh sysadmin and empty metric tables, always rolled back. */
async function withSysadmin(fn: (tx: TransactionSql, as: (user: string) => Promise<void>, admin: string) => Promise<void>) {
  await sql!
    .begin(async (tx) => {
      const [{ id: admin }] = await tx<{ id: string }[]>`insert into auth.users (id, email) values (gen_random_uuid(), 'admin@example.com') returning id`;
      await tx`insert into sysadmins (user_id) values (${admin})`;
      await tx`delete from vps_metrics`;
      await tx`delete from vps_metrics_hourly`;
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

/** Inserts one sample `minutesAgo` before now with the given CPU and traffic. */
async function sample(tx: TransactionSql, minutesAgo: number, cpu: number | null, rx = 100) {
  await tx`
    insert into vps_metrics (sampled_at, cpu_pct, load1, load5, load15, mem_total_bytes, mem_used_bytes, swap_total_bytes, swap_used_bytes,
                             disk_total_bytes, disk_used_bytes, net_rx_bytes, net_tx_bytes, uptime_s, worker_rss_bytes, worker_started_at)
    values (now() - make_interval(mins => ${minutesAgo}), ${cpu}, 0.5, 0.4, 0.3, 1000, 600, 2000, 100, 10000, 4000, ${rx}, 10, 3600, 50, now() - interval '1 day')`;
}

describe.skipIf(!sql)("vps metrics", () => {
  it("rolls up completed hours only and applies the retention", async () => {
    await withSysadmin(async (tx) => {
      // Two samples in a completed hour, one in the current hour, one older than 7 days.
      await sample(tx, 90, 20);
      await sample(tx, 89, 40);
      await sample(tx, 0, 90);
      await sample(tx, 8 * 24 * 60, 10);
      await tx`insert into vps_metrics_hourly (hour, samples, cpu_avg, cpu_max, load1_avg, mem_total_bytes, mem_used_avg, mem_used_max,
                 swap_total_bytes, swap_used_max, disk_total_bytes, disk_used_max, net_rx_bytes, net_tx_bytes, worker_rss_max)
               values (date_trunc('hour', now()) - interval '40 days', 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1)`;
      const [{ r }] = await tx`select rollup_vps_metrics() as r`;
      expect(r).toMatchObject({ purged_samples: 1, purged_hours: 1 });
      const hours = await tx`select samples, cpu_avg, cpu_max, net_rx_bytes from vps_metrics_hourly where hour < date_trunc('hour', now()) and hour > now() - interval '7 days' order by hour`;
      // The 8-day-old sample was rolled before being purged; the current hour is not rolled.
      expect(hours.map((h) => Number(h.samples)).reduce((a, b) => a + b, 0)).toBe(2);
      const [{ n }] = await tx`select count(*)::int as n from vps_metrics_hourly where hour = date_trunc('hour', now())`;
      expect(n).toBe(0);
      // Running it again changes nothing.
      const [{ r: again }] = await tx`select rollup_vps_metrics() as r`;
      expect(again).toMatchObject({ purged_samples: 0, purged_hours: 0 });
    });
  });

  it("returns the latest sample and bucketed series per range to sysadmins", async () => {
    await withSysadmin(async (tx, as, admin) => {
      await sample(tx, 2, 30, 300);
      await sample(tx, 1, 50, 500);
      await sample(tx, 3 * 60, 10);
      await tx`select rollup_vps_metrics()`;
      await as(admin);
      const [{ v }] = await tx`select admin_vps('24h') as v`;
      expect(v).toMatchObject({ range: "24h", bucket_seconds: 300, stale_after_seconds: 300 });
      expect(v.current).toMatchObject({ cpu_pct: 50, net_rx_bytes: 500 });
      expect(v.series.length).toBeGreaterThanOrEqual(2);
      const total24 = v.series.reduce((a: number, b: { net_rx: number }) => a + Number(b.net_rx), 0);
      expect(total24).toBe(900);

      // 7d: rolled hours plus the hours not rolled yet, without double counting.
      const [{ v: week }] = await tx`select admin_vps('7d') as v`;
      expect(week.bucket_seconds).toBe(3600);
      expect(week.series.reduce((a: number, b: { net_rx: number }) => a + Number(b.net_rx), 0)).toBe(900);
      const [{ v: month }] = await tx`select admin_vps('30d') as v`;
      expect(month.bucket_seconds).toBe(14400);
      expect(month.series.reduce((a: number, b: { net_rx: number }) => a + Number(b.net_rx), 0)).toBe(900);
      await expect(tx`select admin_vps('1y')`.execute()).rejects.toThrow(/unknown range/);
    });
  });

  it("refuses non-sysadmins and direct table access", async () => {
    await withSysadmin(async (tx, as) => {
      const [{ id: user }] = await tx<{ id: string }[]>`insert into auth.users (id, email) values (gen_random_uuid(), 'utente@example.com') returning id`;
      await as(user);
      await expect(tx`select admin_vps()`.execute()).rejects.toThrow(/not a sysadmin/);
    });
    await withSysadmin(async (tx, as) => {
      const [{ id: user }] = await tx<{ id: string }[]>`insert into auth.users (id, email) values (gen_random_uuid(), 'utente@example.com') returning id`;
      await as(user);
      await expect(tx`select * from vps_metrics`.execute()).rejects.toThrow(/permission denied/);
    });
    await withSysadmin(async (tx, as, admin) => {
      await as(admin);
      await expect(tx`select rollup_vps_metrics()`.execute()).rejects.toThrow(/permission denied/);
    });
  });
});
