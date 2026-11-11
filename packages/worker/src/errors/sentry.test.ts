import { beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({ init: vi.fn(), captureException: vi.fn(() => "evt1"), flush: vi.fn(async () => true), isEnabled: vi.fn(() => true) }));
vi.mock("@sentry/node", () => sentry);

const { createSentryReporter } = await import("./sentry.ts");

describe("createSentryReporter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("initialises errors-only Sentry without PII and with scrubbing", () => {
    createSentryReporter("https://k@o.ingest.sentry.io/1", "abc123");
    const options = sentry.init.mock.calls[0][0];
    expect(options).toMatchObject({ dsn: "https://k@o.ingest.sentry.io/1", release: "abc123", dataCollection: expect.objectContaining({ userInfo: false, stackFrameVariables: false }), enableOpenTelemetrySetup: false });
    expect(options.beforeSend({ message: "a@b.it" }).message).toBe("[email]");
  });

  it("captures with tags and flushes", async () => {
    const reporter = createSentryReporter("dsn", undefined);
    const error = new Error("boom");
    reporter.capture(error, { job: "backup" });
    await reporter.flush(500);
    expect(sentry.captureException).toHaveBeenCalledWith(error, { tags: { job: "backup" } });
    expect(sentry.flush).toHaveBeenCalledWith(500);
  });

  it("sends a delivered test event", async () => {
    const result = await createSentryReporter("dsn", undefined).sendTest();
    expect(result).toEqual({ enabled: true, delivered: true, eventId: "evt1" });
    expect(sentry.captureException).toHaveBeenCalledWith(expect.objectContaining({ message: "Sentry test error (MonetIO worker)" }), { tags: { sentry_test: "true" } });
  });
});
