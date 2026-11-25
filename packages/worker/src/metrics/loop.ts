import type { Sql } from "postgres";
import { errorMessage, type Logger } from "../logger.ts";
import { isSchemaNotReady } from "../schema.ts";
import type { VpsSample } from "./sampler.ts";

/** One sample a minute: the console flags the VPS as silent after 5 minutes without one. */
export const SAMPLE_INTERVAL_MS = 60_000;

export type SampleWriter = (sample: VpsSample) => Promise<void>;

/** Inserts into vps_metrics (migration 0046). */
export function createPostgresSampleWriter(sql: Sql): SampleWriter {
  return async (s) => {
    await sql`
      insert into vps_metrics (sampled_at, cpu_pct, load1, load5, load15, mem_total_bytes, mem_used_bytes, swap_total_bytes, swap_used_bytes,
                               disk_total_bytes, disk_used_bytes, net_rx_bytes, net_tx_bytes, uptime_s, worker_rss_bytes, worker_started_at, worker_release)
      values (${s.sampledAt}, ${s.cpuPct}, ${s.load[0]}, ${s.load[1]}, ${s.load[2]}, ${s.memTotal}, ${s.memUsed}, ${s.swapTotal}, ${s.swapUsed},
              ${s.diskTotal}, ${s.diskUsed}, ${s.netRx}, ${s.netTx}, ${s.uptimeS}, ${s.workerRss}, ${s.workerStartedAt}, ${s.workerRelease})
      on conflict (sampled_at) do nothing`;
  };
}

export interface MetricsLoopDeps {
  sample(): Promise<VpsSample>;
  write: SampleWriter;
  /** Same gate as the jobs: no writes before the migration that ships with this bundle is applied. */
  schemaReady(): Promise<boolean>;
  log: Logger;
  intervalMs?: number;
}

/**
 * Samples outside the serial job queue, so a long job (backup, bank sync) never leaves a gap that
 * would read as a silent VPS. Failures are logged and never stop the loop.
 */
export function createMetricsLoop(deps: MetricsLoopDeps) {
  let timer: ReturnType<typeof setInterval> | null = null;
  let running = false;

  async function tick() {
    if (running) return;
    running = true;
    try {
      // Sample even before the schema is ready, so CPU and traffic deltas are primed.
      const sample = await deps.sample();
      if (await deps.schemaReady()) await deps.write(sample);
    } catch (error) {
      if (!isSchemaNotReady(error)) deps.log("warn", "vps sample failed", { error: errorMessage(error) });
    } finally {
      running = false;
    }
  }

  return {
    tick,
    start() {
      if (timer) return;
      void tick();
      timer = setInterval(() => void tick(), deps.intervalMs ?? SAMPLE_INTERVAL_MS);
      timer.unref?.();
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}
