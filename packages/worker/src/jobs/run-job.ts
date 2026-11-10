import type { Heartbeat } from "../heartbeat.ts";
import { errorMessage, type Logger } from "../logger.ts";
import type { LockStore } from "./lock.ts";
import { withJobLock } from "./lock.ts";
import type { Job } from "./types.ts";

export interface RunJobDeps {
  locks: LockStore;
  heartbeat: Heartbeat;
  log: Logger;
  /** Unique id of this worker process, stored as lock holder. */
  holder: string;
  /** Aborted on shutdown. */
  shutdown: AbortSignal;
  now?: () => number;
}

/** Runs one job under its lease with heartbeat and logging; never throws. */
export async function runJob(job: Job, deps: RunJobDeps): Promise<void> {
  const now = deps.now ?? Date.now;
  const started = now();
  const signal = AbortSignal.any([deps.shutdown, AbortSignal.timeout(job.timeoutMs)]);
  await deps.heartbeat.ping(job.name, "start");
  try {
    const result = await withJobLock(deps.locks, job.name, deps.holder, job.timeoutMs, () => job.run({ log: deps.log, signal }));
    const durationMs = now() - started;
    if (!result.ran) {
      // Another runner holds the lease: the job is covered, so the monitor still gets a success.
      deps.log("info", "job skipped, lock held elsewhere", { job: job.name });
      await deps.heartbeat.ping(job.name, "success", "skipped: lock held elsewhere");
      return;
    }
    deps.log("info", "job done", { job: job.name, durationMs });
    await deps.heartbeat.ping(job.name, "success");
  } catch (error) {
    deps.log("error", "job failed", { job: job.name, durationMs: now() - started, error: errorMessage(error) });
    await deps.heartbeat.ping(job.name, "fail", errorMessage(error));
  }
}
