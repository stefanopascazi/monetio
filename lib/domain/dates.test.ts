import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonthsToKey,
  dateLabel,
  daysBetween,
  endOfMonth,
  isoToDate,
  italianMonthNumber,
  makeDate,
  monthKey,
  monthLabel,
  monthsBetween,
  todayISO,
} from "./dates";

describe("dates", () => {
  it("clamps day to month length and wraps months", () => {
    expect(makeDate(2026, 2, 31)).toBe("2026-02-28");
    expect(makeDate(2028, 2, 31)).toBe("2028-02-29");
    expect(makeDate(2026, 13, 5)).toBe("2027-01-05");
    expect(makeDate(2026, 0, 5)).toBe("2025-12-05");
  });

  it("adds days across months", () => {
    expect(addDays("2026-01-30", 3)).toBe("2026-02-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("handles month keys", () => {
    expect(monthKey("2026-11-05")).toBe("2026-11");
    expect(addMonthsToKey("2026-11", 3)).toBe("2027-02");
    expect(endOfMonth("2026-02")).toBe("2026-02-28");
    expect(monthsBetween("2026-11", "2027-02")).toBe(3);
    expect(daysBetween("2026-11-05", "2026-11-12")).toBe(7);
  });

  it("formats Italian labels and parses month names", () => {
    expect(monthLabel("2026-11")).toBe("nov 2026");
    expect(monthLabel("2026-11", true)).toBe("novembre 2026");
    expect(dateLabel("2026-11-05")).toBe("5 nov 2026");
    expect(italianMonthNumber("Febbraio")).toBe(2);
    expect(italianMonthNumber("foo")).toBeNull();
  });

  it("converts to a local Date", () => {
    const d = isoToDate("2026-11-05");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 5]);
  });

  it("computes today in Rome", () => {
    expect(todayISO(new Date("2026-11-05T23:30:00Z"))).toBe("2026-11-06");
  });
});
