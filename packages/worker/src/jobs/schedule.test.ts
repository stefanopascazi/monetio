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

describe("slotsDue in a time zone", () => {
  const isDue = slotsDue([8, 12, 18, 23], "Europe/Rome");

  it("follows Rome wall-clock hours in winter (UTC+1)", () => {
    expect(isDue(at("2026-11-19T06:00:00Z"), at("2026-11-19T06:59:00Z"))).toBe(false);
    expect(isDue(at("2026-11-19T06:00:00Z"), at("2026-11-19T07:00:00Z"))).toBe(true);
    expect(isDue(at("2026-11-19T07:05:00Z"), at("2026-11-19T10:59:00Z"))).toBe(false);
    expect(isDue(at("2026-11-19T07:05:00Z"), at("2026-11-19T22:00:00Z"))).toBe(true);
  });

  it("follows Rome wall-clock hours in summer (UTC+2)", () => {
    expect(isDue(at("2026-07-10T04:00:00Z"), at("2026-07-10T05:59:00Z"))).toBe(false);
    expect(isDue(at("2026-07-10T04:00:00Z"), at("2026-07-10T06:00:00Z"))).toBe(true);
    expect(isDue(at("2026-07-10T16:05:00Z"), at("2026-07-10T21:00:00Z"))).toBe(true);
  });

  it("does not run at night after the 23:00 slot", () => {
    expect(isDue(at("2026-11-19T22:05:00Z"), at("2026-11-20T03:00:00Z"))).toBe(false);
    expect(isDue(at("2026-11-19T21:00:00Z"), at("2026-11-20T03:00:00Z"))).toBe(true);
  });

  it("handles the DST change day", () => {
    // 2026-03-29: Rome switches to UTC+2 at 02:00, so 08:00 is 06:00 UTC.
    expect(isDue(at("2026-03-28T22:05:00Z"), at("2026-03-29T05:59:00Z"))).toBe(false);
    expect(isDue(at("2026-03-28T22:05:00Z"), at("2026-03-29T06:00:00Z"))).toBe(true);
  });
});
