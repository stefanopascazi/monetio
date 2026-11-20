import { describe, expect, it } from "vitest";
import { nextSyncLabel, nextSyncSlot } from "./slots";

describe("nextSyncSlot", () => {
  it("picks the next Rome hour of the day (winter, UTC+1)", () => {
    expect(nextSyncSlot(new Date("2026-11-20T06:30:00Z"))).toEqual({ hour: 8, tomorrow: false });
    expect(nextSyncSlot(new Date("2026-11-20T07:00:00Z"))).toEqual({ hour: 12, tomorrow: false });
    expect(nextSyncSlot(new Date("2026-11-20T16:59:00Z"))).toEqual({ hour: 18, tomorrow: false });
  });

  it("rolls over to tomorrow's first slot after the last one", () => {
    expect(nextSyncSlot(new Date("2026-11-20T22:10:00Z"))).toEqual({ hour: 8, tomorrow: true });
  });

  it("follows daylight saving time (summer, UTC+2)", () => {
    expect(nextSyncSlot(new Date("2026-07-01T09:30:00Z"))).toEqual({ hour: 12, tomorrow: false });
  });
});

describe("nextSyncLabel", () => {
  it("reads as Italian copy", () => {
    expect(nextSyncLabel(new Date("2026-11-20T08:00:00Z"))).toBe("oggi alle 12:00");
    expect(nextSyncLabel(new Date("2026-11-20T22:30:00Z"))).toBe("domani alle 8:00");
  });
});
