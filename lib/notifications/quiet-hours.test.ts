import { describe, expect, it } from "vitest";
import { inQuietHours, pushAfter, romeHour } from "./quiet-hours";

const night = { start: 22, end: 7 };

describe("inQuietHours", () => {
  it("handles windows across midnight", () => {
    expect(inQuietHours(23, night)).toBe(true);
    expect(inQuietHours(3, night)).toBe(true);
    expect(inQuietHours(7, night)).toBe(false);
    expect(inQuietHours(12, night)).toBe(false);
  });

  it("handles same-day windows", () => {
    expect(inQuietHours(14, { start: 13, end: 15 })).toBe(true);
    expect(inQuietHours(15, { start: 13, end: 15 })).toBe(false);
  });
});

describe("romeHour", () => {
  it("follows winter and summer time", () => {
    expect(romeHour(new Date("2026-01-15T21:30:00Z"))).toBe(22);
    expect(romeHour(new Date("2026-07-15T21:30:00Z"))).toBe(23);
  });
});

describe("pushAfter", () => {
  it("sends at once outside quiet hours or when they are off", () => {
    const now = new Date("2026-11-12T10:00:00Z");
    expect(pushAfter(now, night)).toBe(now);
    expect(pushAfter(new Date("2026-11-12T23:00:00Z"), null).toISOString()).toBe("2026-11-12T23:00:00.000Z");
  });

  it("holds push until the end of quiet hours (Rome time)", () => {
    // 23:30 Rome in winter (UTC+1) -> 07:00 Rome = 06:00 UTC.
    expect(pushAfter(new Date("2026-11-12T22:30:00Z"), night).toISOString()).toBe("2026-11-13T06:00:00.000Z");
    // Summer (UTC+2): 07:00 Rome = 05:00 UTC.
    expect(pushAfter(new Date("2026-07-12T21:30:00Z"), night).toISOString()).toBe("2026-07-13T05:00:00.000Z");
  });
});
