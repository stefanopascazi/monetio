import type { ErrorReporter } from "../errors/reporter.ts";
import type { Heartbeat } from "../heartbeat.ts";
import { errorMessage, type Logger } from "../logger.ts";
import { isSchemaNotReady } from "../schema.ts";
import type { LockStore } from "./lock.ts";
import { withJobLock } from "./lock.ts";
import type { Job } from "./types.ts";

export interface RunJobDeps {
  locks: LockStore;
  heartbeat: Heartbeat;
  reporter: ErrorReporter;
  log: Logger;
  /** Unique id of this worker process, stored as lock holder. */
  holder: string;
  /** Aborted on shutdown. */
  shutdown: AbortSignal;
  now?: () => number;
  /** Process start (ms): schema errors right after a deploy are tolerated, see SCHEMA_GRACE_MS. */
  bootedAt?: number;
  /** False while the migration this bundle needs is not applied yet: jobs wait, nothing is reported. */
  schemaReady?: () => Promise<boolean>;
}

type Outcome = "done" | "not-due";

/**
 * Fallback to the schema gate (main.ts): right after a deploy a job may still query a table or
 * column that does not exist yet.
 */
export const SCHEMA_GRACE_MS = 15 * 60_000;
export { isSchemaNotReady };

/** Runs one job under its lease with due check, heartbeat and logging; never throws. */
export async function runJob(job: Job, deps: RunJobDeps): Promise<void> {
  const now = deps.now ?? Date.now;
  const started = now();
  const signal = AbortSignal.any([deps.shutdown, AbortSignal.timeout(job.timeoutMs)]);
  try {
    if (deps.schemaReady && !(await deps.schemaReady())) return;
    const result = await withJobLock(deps.locks, job.name, deps.holder, job.timeoutMs, async (): Promise<Outcome> => {
      if (job.isDue && !job.isDue(await deps.locks.lastSuccess(job.name), new Date(started))) return "not-due";
      await deps.heartbeat.ping(job.name, "start");
      await job.run({ log: deps.log, signal, now: new Date(started) });
      await deps.locks.markSuccess(job.name, deps.holder);
      return "done";
    });
    // Lease held elsewhere or nothing to do: the other runner reports to the monitor.
    if (!result.ran) return deps.log("info", "job skipped, lock held elsewhere", { job: job.name });
    if (result.value === "not-due") return;
    deps.log("info", "job done", { job: job.name, durationMs: now() - started });
    await deps.heartbeat.ping(job.name, "success");
  } catch (error) {
    if (isSchemaNotReady(error) && deps.bootedAt !== undefined && now() - deps.bootedAt < SCHEMA_GRACE_MS) {
      return deps.log("warn", "schema not ready, retrying", { job: job.name, error: errorMessage(error) });
    }
    deps.log("error", "job failed", { job: job.name, durationMs: now() - started, error: errorMessage(error) });
    deps.reporter.capture(error, { job: job.name });
    await deps.heartbeat.ping(job.name, "fail", errorMessage(error));
  }
}
