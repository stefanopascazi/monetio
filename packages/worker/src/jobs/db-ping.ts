import type { Sql } from "postgres";
import type { Job } from "./types.ts";

/** Smoke job: proves the worker is alive and reaches the database (heartbeat every 15 minutes). */
export function createDbPingJob(sql: Sql): Job {
  return {
    name: "db-ping",
    intervalMs: 15 * 60_000,
    timeoutMs: 60_000,
    async run() {
      const [row] = await sql<{ ok: number }[]>`select 1 as ok`;
      if (row?.ok !== 1) throw new Error("unexpected database response");
    },
  };
}
