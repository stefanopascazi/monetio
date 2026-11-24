import { describe, expect, it } from "vitest";
import { currentSyncSlot, nextSyncLabel, nextSyncSlot, slotsForBudget } from "./slots";

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

describe("nextSyncLabel with fewer slots", () => {
  it("skips the slots the account does not use", () => {
    expect(nextSyncLabel(new Date("2026-11-20T08:00:00Z"), [8, 18])).toBe("oggi alle 18:00");
  });
});

describe("currentSyncSlot", () => {
  it("returns the latest started slot in Rome time", () => {
    expect(currentSyncSlot(new Date("2026-11-20T07:00:00Z"))).toBe(8);
    expect(currentSyncSlot(new Date("2026-11-20T17:05:00Z"))).toBe(18);
    expect(currentSyncSlot(new Date("2026-11-20T22:00:00Z"))).toBe(23);
  });

  it("falls back to yesterday's last slot before the first of the day", () => {
    expect(currentSyncSlot(new Date("2026-11-20T05:00:00Z"))).toBe(23);
  });
});

describe("slotsForBudget", () => {
  it("keeps every slot without a limit", () => {
    expect(slotsForBudget(null)).toEqual([8, 12, 18, 23]);
    expect(slotsForBudget(4)).toEqual([8, 12, 18, 23]);
  });

  it("spreads fewer syncs over the day", () => {
    expect(slotsForBudget(2)).toEqual([8, 18]);
    expect(slotsForBudget(3)).toEqual([8, 12, 18]);
    expect(slotsForBudget(1)).toEqual([8]);
  });
});
