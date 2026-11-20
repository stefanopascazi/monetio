import type { Sql } from "postgres";
import { errorMessage } from "../logger.ts";
import { slotsDue } from "./schedule.ts";
import type { Job } from "./types.ts";

/** Nightly slot (Italian time), after the backup. */
export const INTEGRITY_HOUR_ROME = 4;

/** Open anomalies per check plus informational counters, as returned by run_integrity_checks(). */
export type IntegrityTotals = Record<string, number>;

export interface IntegrityStore {
  hasPendingRequest(): Promise<boolean>;
  /** Marks the pending console request as started; null when there is none. */
  claimRequest(): Promise<number | null>;
  finishRequest(id: number, error: string | null): Promise<void>;
  run(requestId: number | null): Promise<IntegrityTotals>;
}

/** admin_job_requests and run_integrity_checks() (migration 0039). */
export function createPostgresIntegrityStore(sql: Sql): IntegrityStore {
  return {
    async hasPendingRequest() {
      const rows = await sql`select 1 from admin_job_requests where job = 'integrity-check' and finished_at is null`;
      return rows.length > 0;
    },
    async claimRequest() {
      const [row] = await sql<{ id: string }[]>`
        update admin_job_requests set started_at = now()
        where job = 'integrity-check' and finished_at is null
        returning id`;
      return row ? Number(row.id) : null;
    },
    async finishRequest(id, error) {
      await sql`update admin_job_requests set finished_at = now(), error = ${error?.slice(0, 300) ?? null} where id = ${id}`;
    },
    async run(requestId) {
      const [row] = await sql<{ totals: IntegrityTotals }[]>`select run_integrity_checks(${requestId}) as totals`;
      return row?.totals ?? {};
    },
  };
}

/** Integrity checks (#47): every night, or within a few minutes when the console asks for a run. */
export function createIntegrityCheckJob(store: IntegrityStore): Job {
  const nightly = slotsDue([INTEGRITY_HOUR_ROME], "Europe/Rome");
  return {
    name: "integrity-check",
    intervalMs: 2 * 60_000,
    timeoutMs: 10 * 60_000,
    isDue: async (last, now) => nightly(last, now) || (await store.hasPendingRequest()),
    async run(ctx) {
      const requestId = await store.claimRequest();
      try {
        const totals = await store.run(requestId);
        if (requestId !== null) await store.finishRequest(requestId, null);
        ctx.log("info", "integrity checked", { requestId, ...totals });
      } catch (error) {
        if (requestId !== null) await store.finishRequest(requestId, errorMessage(error));
        throw error;
      }
    },
  };
}
