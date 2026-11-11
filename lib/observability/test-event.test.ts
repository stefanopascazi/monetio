import { describe, expect, it, vi } from "vitest";
import { sendTestEvent, type SentryProbe } from "./test-event";

const probe = (enabled: boolean, flushed = true): SentryProbe => ({
  isEnabled: () => enabled,
  captureException: vi.fn(() => "evt1"),
  flush: vi.fn(async () => flushed),
});

describe("sendTestEvent", () => {
  it("does nothing when Sentry is disabled", async () => {
    const sentry = probe(false);
    expect(await sendTestEvent(sentry, "app")).toEqual({ enabled: false, delivered: false, eventId: null });
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it("captures a tagged error and waits for delivery", async () => {
    const sentry = probe(true);
    expect(await sendTestEvent(sentry, "app", 100)).toEqual({ enabled: true, delivered: true, eventId: "evt1" });
    expect(sentry.captureException).toHaveBeenCalledWith(expect.objectContaining({ message: "Sentry test error (app)" }), { tags: { sentry_test: "true" } });
    expect(sentry.flush).toHaveBeenCalledWith(100);
  });

  it("reports a delivery timeout", async () => {
    expect((await sendTestEvent(probe(true, false), "app")).delivered).toBe(false);
  });
});
