import type { TestEventResult } from "../../../../lib/observability/test-event.ts";

/** Sends unexpected errors to an external tracker (Sentry) with low-cardinality tags. */
export interface ErrorReporter {
  capture(error: unknown, tags: Record<string, string>): void;
  /** Waits for queued reports before exit. */
  flush(timeoutMs: number): Promise<void>;
  /** Sends a test error and reports whether it was delivered (`--sentry-test`). */
  sendTest(): Promise<TestEventResult>;
}

export const noopReporter: ErrorReporter = {
  capture() {},
  async flush() {},
  async sendTest() {
    return { enabled: false, delivered: false, eventId: null };
  },
};
