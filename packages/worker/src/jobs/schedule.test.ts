import { describe, expect, it } from "vitest";
import { dailyDue } from "./schedule.ts";

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
