import type { Sql, TransactionSql } from "postgres";
import { alertMessage, evaluateAlerts, windowMinutes, type AlertDecision, type AlertInput, type AlertKind, type AlertSettings, type ThresholdKind } from "../metrics/alerts.ts";
import type { Job } from "./types.ts";

/** Resolved alerts and events are kept this long for the console. */
export const ALERTS_RETENTION_DAYS = 90;

export interface VpsAlertStore {
  load(now: Date): Promise<Omit<AlertInput, "now">>;
  /** Writes the decision and queues the pushes; returns how many pushes were queued. */
  apply(decision: AlertDecision, settings: AlertSettings): Promise<number>;
}

interface PushRow {
  id: string;
  kind: AlertKind;
  phase: "open" | "resolved" | "event";
  details: Record<string, unknown>;
}

/** vps_alerts, vps_alert_settings and vps_alert_state (migration 0047); pushes go to every sysadmin. */
export function createPostgresVpsAlertStore(sql: Sql | TransactionSql): VpsAlertStore {
  // A savepoint when already inside a transaction (database tests run rolled back).
  const atomic = <T>(fn: (tx: TransactionSql) => Promise<T>): Promise<T> =>
    ("savepoint" in sql ? sql.savepoint(fn) : (sql as Sql).begin(fn)) as Promise<T>;
  return {
    async load(now) {
      const [settings] = await sql<AlertSettings[]>`
        select cpu_pct, cpu_minutes, ram_pct, ram_minutes, swap_pct, disk_pct, traffic_factor, traffic_floor_mb, push_enabled from vps_alert_settings`;
      if (!settings) throw new Error("vps_alert_settings is empty");
      const [state] = await sql<{ evaluated_until: Date | null }[]>`select evaluated_until from vps_alert_state`;
      const evaluatedUntil = state?.evaluated_until ?? null;
      const windowStart = new Date(now.getTime() - windowMinutes(settings) * 60_000);
      const cutoff = evaluatedUntil && evaluatedUntil < windowStart ? evaluatedUntil : windowStart;
      // The sample at or before the cutoff anchors gaps and restarts; at most 3 hours of samples after it.
      const rows = await sql<
        { sampled_at: Date; cpu_pct: number | null; mem_pct: number; swap_pct: number | null; disk_pct: number; net_bytes: string | null; uptime_s: string; worker_started_at: Date; worker_release: string | null }[]
      >`
        select sampled_at, cpu_pct,
               mem_used_bytes * 100.0 / nullif(mem_total_bytes, 0) as mem_pct,
               swap_used_bytes * 100.0 / nullif(swap_total_bytes, 0) as swap_pct,
               disk_used_bytes * 100.0 / nullif(disk_total_bytes, 0) as disk_pct,
               net_rx_bytes + net_tx_bytes as net_bytes, uptime_s, worker_started_at, worker_release
        from (
          (select * from vps_metrics where sampled_at <= ${cutoff} order by sampled_at desc limit 1)
          union all
          (select * from vps_metrics where sampled_at > ${cutoff} order by sampled_at limit 180)
        ) m
        order by sampled_at`;
      const [traffic] = await sql<{ avg: string | null }[]>`
        select case when count(*) >= 24 then avg(net_rx_bytes + net_tx_bytes) end as avg
        from vps_metrics_hourly where hour > now() - interval '7 days'`;
      const open = await sql<{ kind: ThresholdKind }[]>`select kind from vps_alerts where resolved_at is null`;
      return {
        settings: { ...settings, cpu_pct: Number(settings.cpu_pct), ram_pct: Number(settings.ram_pct), swap_pct: Number(settings.swap_pct), disk_pct: Number(settings.disk_pct), traffic_factor: Number(settings.traffic_factor) },
        evaluatedUntil,
        hourlyTrafficAvg: traffic?.avg == null ? null : Number(traffic.avg),
        openKinds: open.map((o) => o.kind),
        samples: rows.map((r) => ({
          sampledAt: r.sampled_at,
          cpuPct: r.cpu_pct === null ? null : Number(r.cpu_pct),
          memPct: Number(r.mem_pct ?? 0),
          swapPct: r.swap_pct === null ? null : Number(r.swap_pct),
          diskPct: Number(r.disk_pct ?? 0),
          netBytes: r.net_bytes === null ? null : Number(r.net_bytes),
          uptimeS: Number(r.uptime_s),
          workerStartedAt: r.worker_started_at,
          workerRelease: r.worker_release,
        })),
      };
    },

    async apply(decision, settings) {
      return atomic(async (tx) => {
        const pushes: PushRow[] = [];
        for (const o of decision.open) {
          const [row] = await tx<{ id: string }[]>`
            insert into vps_alerts (kind, details) values (${o.kind}, ${tx.json(o.details as never)})
            on conflict (kind) where resolved_at is null do nothing returning id`;
          if (row) pushes.push({ id: row.id, kind: o.kind, phase: "open", details: o.details });
        }
        for (const k of decision.keep) {
          await tx`update vps_alerts set last_seen_at = now(), details = ${tx.json(k.details as never)} where kind = ${k.kind} and resolved_at is null`;
        }
        for (const kind of decision.resolve) {
          const rows = await tx<{ id: string; details: Record<string, unknown> }[]>`
            update vps_alerts set resolved_at = now() where kind = ${kind} and resolved_at is null returning id, details`;
          for (const r of rows) pushes.push({ id: r.id, kind, phase: "resolved", details: r.details });
        }
        for (const e of decision.events) {
          const [row] = await tx<{ id: string }[]>`
            insert into vps_alerts (kind, opened_at, last_seen_at, resolved_at, details)
            values (${e.kind}, ${e.at}, ${e.at}, ${e.at}, ${tx.json(e.details as never)}) returning id`;
          pushes.push({ id: row!.id, kind: e.kind, phase: "event", details: e.details });
        }
        if (decision.evaluatedUntil) await tx`update vps_alert_state set evaluated_until = ${decision.evaluatedUntil}`;
        await tx`delete from vps_alerts where resolved_at < now() - make_interval(days => ${ALERTS_RETENTION_DAYS})`;

        if (!settings.push_enabled || !pushes.length) return 0;
        let queued = 0;
        for (const p of pushes) {
          const msg = alertMessage(p.kind, p.phase, p.details);
          const result = await tx`
            insert into push_outbox (user_id, kind, title, body, url, tag, dedup_key)
            select user_id, 'vps_alert', ${msg.title}, ${msg.body}, '/notifiche', ${`vps-${p.kind}`}, concat('vps:', ${p.id}::text, ':', ${p.phase}::text, ':', user_id)
            from sysadmins
            on conflict (dedup_key) do nothing`;
          queued += result.count;
        }
        return queued;
      });
    },
  };
}

/** VPS alerts (#104): every minute, thresholds and events from the latest samples, pushed to sysadmins. */
export function createVpsAlertsJob(store: VpsAlertStore): Job {
  return {
    name: "vps-alerts",
    intervalMs: 60_000,
    timeoutMs: 60_000,
    async run(ctx) {
      const loaded = await store.load(ctx.now);
      const decision = evaluateAlerts({ ...loaded, now: ctx.now });
      if (!decision.open.length && !decision.resolve.length && !decision.events.length) {
        if (decision.keep.length || decision.evaluatedUntil?.getTime() !== loaded.evaluatedUntil?.getTime()) await store.apply(decision, loaded.settings);
        return;
      }
      const pushes = await store.apply(decision, loaded.settings);
      ctx.log("warn", "vps alerts", {
        opened: decision.open.map((o) => o.kind),
        resolved: decision.resolve,
        events: decision.events.map((e) => e.kind),
        pushes,
      });
    },
  };
}
