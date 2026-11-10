import type { Logger } from "../logger.ts";

export interface JobContext {
  log: Logger;
  /** Aborted on shutdown or when the job exceeds its lease. */
  signal: AbortSignal;
  /** Start time of this run. */
  now: Date;
}

export interface Job {
  /** Stable id: lock name, heartbeat env suffix and log field. */
  name: string;
  /** How often the scheduler considers the job. */
  intervalMs: number;
  /** Lease length; the job is aborted when it runs longer. */
  timeoutMs: number;
  /**
   * Optional gate checked under the lease against the last successful run (stored in the DB,
   * so it survives restarts). When false the run is skipped silently, without heartbeat.
   */
  isDue?(lastSuccess: Date | null, now: Date): boolean;
  run(ctx: JobContext): Promise<void>;
}
