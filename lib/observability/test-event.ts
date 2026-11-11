/** The Sentry calls the test needs, injected so it runs without the SDK in unit tests. */
export interface SentryProbe {
  isEnabled(): boolean;
  captureException(error: Error, hint: { tags: Record<string, string> }): string;
  flush(timeoutMs: number): Promise<boolean>;
}

export interface TestEventResult {
  /** False when the DSN is missing: nothing can be sent. */
  enabled: boolean;
  /** True when the SDK confirmed the event left the process. */
  delivered: boolean;
  eventId: string | null;
}

/** Sends a tagged test error and waits for delivery, to verify the full pipeline end to end. */
export async function sendTestEvent(sentry: SentryProbe, source: string, timeoutMs = 5_000): Promise<TestEventResult> {
  if (!sentry.isEnabled()) return { enabled: false, delivered: false, eventId: null };
  const eventId = sentry.captureException(new Error(`Sentry test error (${source})`), { tags: { sentry_test: "true" } });
  const delivered = await sentry.flush(timeoutMs);
  return { enabled: true, delivered, eventId };
}
