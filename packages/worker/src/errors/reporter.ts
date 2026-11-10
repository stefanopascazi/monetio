/** Sends unexpected errors to an external tracker (Sentry) with low-cardinality tags. */
export interface ErrorReporter {
  capture(error: unknown, tags: Record<string, string>): void;
  /** Waits for queued reports before exit. */
  flush(timeoutMs: number): Promise<void>;
}

export const noopReporter: ErrorReporter = {
  capture() {},
  async flush() {},
};
