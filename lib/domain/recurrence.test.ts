import { describe, expect, it } from "vitest";
import { nextOccurrence, occurrences, type Schedule } from "./recurrence";

const monthly: Schedule = { frequency: "monthly", dayOfMonth: 31, startDate: "2026-01-15", endDate: null };

describe("occurrences", () => {
  it("steps monthly and clamps to month end", () => {
    expect(occurrences(monthly, "2026-01-01", "2026-04-30")).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("skips a day before the start date in the first month", () => {
    const s: Schedule = { ...monthly, dayOfMonth: 10 };
    expect(occurrences(s, "2026-01-01", "2026-03-31")).toEqual(["2026-02-10", "2026-03-10"]);
  });

  it("respects end date and quarterly steps", () => {
    const s: Schedule = { frequency: "quarterly", dayOfMonth: 1, startDate: "2026-01-01", endDate: "2026-09-30" };
    expect(occurrences(s, "2025-01-01", "2030-01-01")).toEqual(["2026-01-01", "2026-04-01", "2026-07-01"]);
  });

  it("jumps far from the start without losing alignment", () => {
    const s: Schedule = { frequency: "bimonthly", dayOfMonth: 5, startDate: "2020-01-05", endDate: null };
    expect(occurrences(s, "2026-02-01", "2026-06-30")).toEqual(["2026-03-05", "2026-05-05"]);
  });

  it("steps weekly from the start date", () => {
    const s: Schedule = { frequency: "weekly", dayOfMonth: 1, startDate: "2026-11-02", endDate: null };
    expect(occurrences(s, "2026-11-05", "2026-11-20")).toEqual(["2026-11-09", "2026-11-16"]);
  });

  it("returns nothing when ended", () => {
    expect(occurrences({ ...monthly, endDate: "2025-12-31" }, "2026-01-01", "2026-12-31")).toEqual([]);
  });
});

describe("nextOccurrence", () => {
  it("finds the next date or null", () => {
    expect(nextOccurrence({ frequency: "yearly", dayOfMonth: 10, startDate: "2024-12-10", endDate: null }, "2026-11-05")).toBe("2026-12-10");
    expect(nextOccurrence({ ...monthly, endDate: "2026-02-01" }, "2026-11-05")).toBeNull();
  });
});
