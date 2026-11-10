import type { Job } from "../jobs/types.ts";
import type { SerialQueue } from "./queue.ts";

/** Jobs whose interval has elapsed since their last start; never-run jobs are due at once. */
export function dueJobs(jobs: Job[], lastStart: ReadonlyMap<string, number>, now: number): Job[] {
  return jobs.filter((job) => {
    const last = lastStart.get(job.name);
    return last === undefined || now - last >= job.intervalMs;
  });
}

export interface Scheduler {
  /** Enqueues due jobs; exposed for tests and for the first run at startup. */
  tick(now?: number): void;
  start(): void;
  stop(): void;
}

export function createScheduler(opts: {
  jobs: Job[];
  queue: SerialQueue;
  tickMs: number;
  runJob: (job: Job) => Promise<void>;
}): Scheduler {
  const lastStart = new Map<string, number>();
  let timer: ReturnType<typeof setInterval> | undefined;

  const tick = (now = Date.now()) => {
    for (const job of dueJobs(opts.jobs, lastStart, now)) {
      // A job still queued from an earlier tick keeps its slot: no pile-up behind a slow job.
      if (opts.queue.push(job.name, () => opts.runJob(job))) lastStart.set(job.name, now);
    }
  };

  return {
    tick,
    start() {
      tick();
      timer = setInterval(tick, opts.tickMs);
    },
    stop() {
      clearInterval(timer);
      timer = undefined;
    },
  };
}
