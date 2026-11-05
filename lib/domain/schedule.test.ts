import { describe, expect, it } from "vitest";
import { contribution, rule, txn } from "./fixtures";
import { autoBookings, bookedOccurrences, contributionKey, dueEntries, horizonEnd, ruleKey, upcomingOccurrences } from "./schedule";

const today = "2026-11-05";

describe("bookedOccurrences", () => {
  it("collects rule and contribution keys", () => {
    const set = bookedOccurrences([
      txn({ amountCents: -1, bookedOn: "2026-11-01", recurringRuleId: "r1", occurrenceDate: "2026-11-01" }),
      txn({ amountCents: -1, bookedOn: "2026-10-28", contributionRuleId: "c1", occurrenceDate: "2026-10-28" }),
      txn({ amountCents: -1, bookedOn: "2026-10-28" }),
    ]);
    expect([...set]).toEqual([ruleKey("r1", "2026-11-01"), contributionKey("c1", "2026-10-28")]);
  });
});

describe("period matching", () => {
  it("keeps an occurrence paid when the rule's day changes within the month", () => {
    const paid = bookedOccurrences([txn({ amountCents: -1, bookedOn: "2026-11-03", recurringRuleId: "luce", occurrenceDate: "2026-11-15" })], [{ id: "luce", frequency: "monthly" }]);
    const moved = rule({ id: "luce", amountCents: -10000, schedule: "due", dayOfMonth: 3, startDate: "2026-11-01" });
    expect(dueEntries([moved], [], paid, today, () => 0, { lookbackDays: 30, horizonDays: 20 })).toEqual([]);
  });

  it("matches weekly rules by exact date", () => {
    expect(ruleKey("w", "2026-11-03", "weekly")).not.toBe(ruleKey("w", "2026-11-10", "weekly"));
    expect(ruleKey("m", "2026-11-03")).toBe(ruleKey("m", "2026-11-28"));
  });

  it("matches contributions by month", () => {
    expect(contributionKey("c", "2026-11-03")).toBe(contributionKey("c", "2026-11-28"));
  });
});

describe("autoBookings", () => {
  it("returns unbooked auto occurrences up to today", () => {
    const r = rule({ amountCents: -78110, dayOfMonth: 1, startDate: "2026-09-01" });
    const booked = new Set([ruleKey("r1", "2026-10-01")]);
    expect(autoBookings([r, rule({ id: "r2", amountCents: -1, schedule: "due" })], booked, today, "2026-09-15").map((e) => e.date)).toEqual([
      "2026-11-01",
    ]);
  });
});

describe("dueEntries", () => {
  const spending = () => 28057;

  it("lists unpaid due rules with overdue flag and contribution amounts", () => {
    const luce = rule({ id: "luce", amountCents: -10000, schedule: "due", dayOfMonth: 20, startDate: "2026-10-01" });
    const entries = dueEntries([luce], [contribution({ startDate: "2026-10-01" })], new Set([contributionKey("c1", "2026-10-28")]), today, spending, {
      lookbackDays: 30,
      horizonDays: 30,
    });
    expect(entries.map((e) => [e.key, e.amountCents, e.overdue, e.estimated])).toEqual([
      [ruleKey("luce", "2026-10-20"), -10000, true, false],
      [ruleKey("luce", "2026-11-20"), -10000, false, false],
      [contributionKey("c1", "2026-11-28"), -95000, false, true],
    ]);
  });

  it("uses the estimate for future months", () => {
    const entries = dueEntries([], [contribution({ dayOfMonth: 2 })], new Set(), today, spending, { lookbackDays: 0, horizonDays: 30 });
    expect(entries.map((e) => [e.date, e.amountCents])).toEqual([["2026-12-02", -(80000 + 23000)]]);
  });
});

describe("upcomingOccurrences", () => {
  it("includes every schedule and skips booked", () => {
    const rules = [rule({ amountCents: -1399, dayOfMonth: 10 }), rule({ id: "e", amountCents: -45000, schedule: "estimate", dayOfMonth: 30 })];
    expect(upcomingOccurrences(rules, new Set([ruleKey("r1", "2026-11-10")]), today, 40).map((e) => e.key)).toEqual([
      ruleKey("e", "2026-11-30"),
      ruleKey("r1", "2026-12-10"),
    ]);
  });
});

describe("horizonEnd", () => {
  it("returns the end of the target month", () => {
    expect(horizonEnd(today, 3)).toBe("2027-02-28");
  });
});
