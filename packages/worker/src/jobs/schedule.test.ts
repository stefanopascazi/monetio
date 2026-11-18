import { describe, expect, it } from "vitest";
import { dailyDue, slotsDue } from "./schedule.ts";

const at = (iso: string) => new Date(iso);

describe("dailyDue", () => {
  const isDue = dailyDue(1);

  it("is due when the job never succeeded", () => {
    expect(isDue(null, at("2026-11-10T00:30:00Z"))).toBe(true);
  });

  it("is not due again on the same day after the slot", () => {
    expect(isDue(at("2026-11-10T01:05:00Z"), at("2026-11-10T13:00:00Z"))).toBe(false);
  });

  it("is due after today's slot when the last success was yesterday", () => {
    expect(isDue(at("2026-11-09T01:05:00Z"), at("2026-11-10T01:00:00Z"))).toBe(true);
  });

  it("waits for today's slot before running again", () => {
    expect(isDue(at("2026-11-09T01:05:00Z"), at("2026-11-10T00:59:00Z"))).toBe(false);
  });

  it("catches up a missed day", () => {
    expect(isDue(at("2026-11-08T01:05:00Z"), at("2026-11-10T00:30:00Z"))).toBe(true);
  });

  it("handles month boundaries", () => {
    expect(isDue(at("2026-11-30T01:05:00Z"), at("2026-12-01T01:10:00Z"))).toBe(true);
  });
});

describe("slotsDue", () => {
  const isDue = slotsDue([4, 10, 16, 22]);

  it("is due right after each slot and not again before the next one", () => {
    expect(isDue(at("2026-11-10T04:05:00Z"), at("2026-11-10T09:59:00Z"))).toBe(false);
    expect(isDue(at("2026-11-10T04:05:00Z"), at("2026-11-10T10:00:00Z"))).toBe(true);
  });

  it("uses yesterday's last slot before today's first", () => {
    expect(isDue(at("2026-11-09T22:10:00Z"), at("2026-11-10T03:00:00Z"))).toBe(false);
    expect(isDue(at("2026-11-09T21:00:00Z"), at("2026-11-10T03:00:00Z"))).toBe(true);
  });

  it("is due when never run", () => {
    expect(isDue(null, at("2026-11-10T03:00:00Z"))).toBe(true);
  });
});
