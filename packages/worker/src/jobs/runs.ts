import type { Sql } from "postgres";
import type { Job } from "./types.ts";

/** Run history is kept this long for the sysadmin console (#47). */
export const JOB_RUNS_RETENTION_DAYS = 30;

export interface JobRun {
  job: string;
  startedAt: Date;
  durationMs: number;
  status: "success" | "failed";
  error: string | null;
  holder: string;
}

export interface JobRunStore {
  record(run: JobRun): Promise<void>;
  /** Deletes runs started before `before`; returns how many. */
  purge(before: Date): Promise<number>;
}

/** Rows in `job_runs` (migration 0038). Errors are cut to the column limit. */
export function createPostgresJobRunStore(sql: Sql): JobRunStore {
  return {
    async record(run) {
      await sql`
        insert into job_runs (job, started_at, duration_ms, status, error, holder)
        values (${run.job}, ${run.startedAt}, ${Math.max(0, Math.round(run.durationMs))}, ${run.status}, ${run.error?.slice(0, 300) ?? null}, ${run.holder})`;
    },
    async purge(before) {
      const rows = await sql`delete from job_runs where started_at < ${before} returning id`;
      return rows.length;
    },
  };
}

/** Daily cleanup of the run history. */
export function createJobRunsPurgeJob(store: JobRunStore): Job {
  return {
    name: "job-runs-purge",
    intervalMs: 60 * 60_000,
    timeoutMs: 5 * 60_000,
    isDue: (last, now) => !last || now.getTime() - last.getTime() >= 24 * 3_600_000,
    async run(ctx) {
      const removed = await store.purge(new Date(ctx.now.getTime() - JOB_RUNS_RETENTION_DAYS * 86_400_000));
      if (removed) ctx.log("info", "job runs purged", { removed });
    },
  };
}
