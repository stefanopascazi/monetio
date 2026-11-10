import type { Logger } from "../logger.ts";

export interface JobContext {
  log: Logger;
  /** Aborted on shutdown or when the job exceeds its lease. */
  signal: AbortSignal;
}

export interface Job {
  /** Stable id: lock name, heartbeat env suffix and log field. */
  name: string;
  intervalMs: number;
  /** Lease length; the job is aborted when it runs longer. */
  timeoutMs: number;
  run(ctx: JobContext): Promise<void>;
}
