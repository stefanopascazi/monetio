import { describe, expect, it } from "vitest";
import { contribution, rule, txn } from "./fixtures";
import { type ProjectionInput, projectBalances } from "./projection";
import { overrideMap, ruleKey } from "./schedule";

const base: ProjectionInput = {
  today: "2026-11-05",
  months: 3,
  balances: { joint: 100000, ste: 50000 },
  rules: [],
  contributions: [],
  booked: new Set(),
  contributionSpending: () => 0,
  categorySpent: () => 0,
  planned: [],
  lookbackDays: 30,
};

describe("projectBalances", () => {
  it("applies monthly rules after today and skips booked ones", () => {
    const mutuo = rule({ id: "m", accountId: "joint", amountCents: -78110, dayOfMonth: 1, startDate: "2026-01-01" });
    const res = projectBalances({ ...base, rules: [mutuo], booked: new Set([ruleKey("m", "2026-11-01")]) });
    expect(res.map((p) => [p.month, p.byAccount.joint])).toEqual([
      ["2026-11", 100000],
      ["2026-12", 21890],
      ["2027-01", -56220],
    ]);
  });

  it("moves transfers between accounts and keeps the total", () => {
    const giro = rule({ id: "g", kind: "transfer", accountId: "ste", counterpartAccountId: "joint", amountCents: -26950, dayOfMonth: 27, startDate: "2026-11-01" });
    const res = projectBalances({ ...base, months: 1, rules: [giro] });
    expect(res[0].byAccount).toEqual({ joint: 126950, ste: 23050 });
    expect(res[0].totalCents).toBe(150000);
  });

  it("uses only the remaining part of an estimate in the current month", () => {
    const spesa = rule({ id: "s", accountId: "joint", categoryId: "spesa", amountCents: -45000, schedule: "estimate", dayOfMonth: 15 });
    const res = projectBalances({ ...base, months: 2, rules: [spesa], categorySpent: () => 30000 });
    expect(res.map((p) => p.byAccount.joint)).toEqual([85000, 40000]);
  });

  it("adds contributions with the larger of actual and estimated spending", () => {
    const c = contribution({ fromAccountId: "ste", toAccountId: "joint", estimatedSpendingCents: 45000, startDate: "2026-11-01" });
    const res = projectBalances({ ...base, months: 2, contributions: [c], contributionSpending: () => 50000 });
    // Nov: 800 + 250 = 1050; Dec: 800 + 230 (225 rounded up) = 1030.
    expect(res.map((p) => p.byAccount.ste)).toEqual([50000 - 105000, 50000 - 105000 - 103000]);
    expect(res[1].totalCents).toBe(150000);
  });

  it("counts overdue unpaid deadlines and planned transactions", () => {
    const luce = rule({ id: "l", accountId: "joint", amountCents: -10000, schedule: "due", dayOfMonth: 20, startDate: "2026-10-01", endDate: "2026-10-31" });
    const planned = [txn({ accountId: "joint", amountCents: -5000, bookedOn: "2026-12-10", status: "planned" })];
    const res = projectBalances({ ...base, months: 2, rules: [luce], planned });
    expect(res.map((p) => p.byAccount.joint)).toEqual([90000, 85000]);
  });

  it("uses actual amounts entered for an occurrence", () => {
    const luce = rule({ id: "l", accountId: "joint", amountCents: -10000, schedule: "due", dayOfMonth: 15, startDate: "2026-11-01", endDate: "2026-11-30" });
    const overrides = overrideMap([{ ruleId: "l", period: "2026-11", amountCents: -8740, dueDate: "2026-12-02", note: null }]);
    const res = projectBalances({ ...base, months: 2, rules: [luce], overrides });
    expect(res.map((p) => p.byAccount.joint)).toEqual([100000, 91260]);
  });

  it("adds historical averages: remaining share now, full months after", () => {
    // 5 Nov: 25 of 30 days left.
    const res = projectBalances({ ...base, months: 2, baseline: { ste: { incomeCents: 220000, expenseCents: 40000 } } });
    expect(res.map((p) => p.byAccount.ste)).toEqual([50000 + 150000, 50000 + 150000 + 180000]);
  });
});
