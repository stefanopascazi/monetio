import type { Sql } from "postgres";
import type { Job } from "./types.ts";

export interface RollupResult {
  hours: number;
  purged_samples: number;
  purged_hours: number;
}

export type RollupStore = () => Promise<RollupResult>;

/** rollup_vps_metrics() (migration 0046). */
export const createPostgresRollupStore =
  (sql: Sql): RollupStore =>
  async () => {
    const [row] = await sql<{ r: RollupResult }[]>`select rollup_vps_metrics() as r`;
    return row?.r ?? { hours: 0, purged_samples: 0, purged_hours: 0 };
  };

/** Hourly rollup and retention of the VPS samples (#104). */
export function createVpsMetricsRollupJob(rollup: RollupStore): Job {
  return {
    name: "vps-metrics-rollup",
    intervalMs: 60 * 60_000,
    timeoutMs: 5 * 60_000,
    async run(ctx) {
      const r = await rollup();
      if (r.purged_samples || r.purged_hours) ctx.log("info", "vps metrics purged", { ...r });
    },
  };
}
