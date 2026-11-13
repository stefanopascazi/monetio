import { describe, expect, it } from "vitest";
import { rule } from "./fixtures";
import type { ProjectionInput } from "./projection";
import { affordableAmount, assessGoal, extraSavingNeeded } from "./verdict";

// Joint account: +2000 € salary, -600 € food, -1000 € mortgage per month = +400 € net.
const base: ProjectionInput = {
  today: "2026-11-05",
  months: 4,
  balances: { joint: 300000 },
  rules: [
    rule({ id: "stip", accountId: "joint", amountCents: 200000, dayOfMonth: 10, startDate: "2026-01-01" }),
    rule({ id: "spesa", accountId: "joint", categoryId: "food", amountCents: -60000, dayOfMonth: 15, startDate: "2026-01-01" }),
    rule({ id: "mutuo", accountId: "joint", categoryId: "home", amountCents: -100000, dayOfMonth: 20, startDate: "2026-01-01" }),
  ],
  contributions: [],
  booked: new Set(),
  contributionSpending: () => 0,
  estimateUsed: () => 0,
  planned: [],
  lookbackDays: 0,
};

const holiday = (amountCents: number, date = "2027-01-05") => ({ label: "Vacanza", accountId: "joint", amountCents, date });

describe("assessGoal", () => {
  it("says yes when the balance stays above the floor", () => {
    const v = assessGoal(base, holiday(100000), { accountIds: ["joint"], reliability: "high" });
    expect(v).toMatchObject({ outcome: "yes", levers: [], tight: false, reliability: "high" });
  });

  it("flags a yes closer to the floor than the uncertainty", () => {
    // Lowest point: 4200 € at end of January minus 1000 € = 3200 €.
    const v = assessGoal(base, holiday(100000), { accountIds: ["joint"], uncertaintyCents: 400000 });
    expect(v.outcome).toBe("yes");
    expect(v.result.lowest).toEqual({ month: "2027-01", cents: 320000 });
    expect(v.tight).toBe(true);
  });

  it("proposes postponing, spending less or cutting a category", () => {
    // 4500 € in January leaves -300 €: short by 300 €.
    const v = assessGoal(base, holiday(450000), { accountIds: ["joint"], cutCategoryIds: ["food"] });
    expect(v.outcome).toBe("yes_if");
    expect(v.result.shortfallCents).toBe(30000);
    expect(v.levers).toEqual([
      { kind: "postpone", date: "2027-02-05" },
      { kind: "reduce", amountCents: 420000 },
      // 100 € left unspent at the end of November, December and January.
      { kind: "save", monthlyCents: 10000 },
      // 17% of 600 € over November–January saves 306 €; 16% only 288 €.
      { kind: "cut", categoryId: "food", percent: 17 },
    ]);
  });

  it("skips a category whose full cut is not enough", () => {
    const v = assessGoal(base, holiday(700000), { accountIds: ["joint"], cutCategoryIds: ["food"] });
    expect(v.levers.some((l) => l.kind === "cut")).toBe(false);
  });

  it("says no when no lever can reach the floor", () => {
    const v = assessGoal(base, holiday(100000), { accountIds: ["joint"], floorCents: 1000000 });
    expect(v).toMatchObject({ outcome: "no", levers: [] });
  });

  it("extends the horizon to include the goal month", () => {
    const v = assessGoal({ ...base, months: 1 }, holiday(100000, "2027-03-10"));
    expect(v.result.scenario.map((m) => m.month)).toEqual(["2026-11", "2026-12", "2027-01", "2027-02", "2027-03"]);
  });
});

describe("assessGoal with accounts outside the scope", () => {
  it("fails a goal that empties an account kept non-negative", () => {
    const ctx = { ...base, balances: { joint: 300000, savings: 100000 } };
    const fromSavings = { label: "Auto", accountId: "savings", amountCents: 150000, date: "2027-01-05" };
    expect(assessGoal(ctx, fromSavings, { accountIds: ["joint"] }).outcome).toBe("yes");
    const v = assessGoal(ctx, fromSavings, { accountIds: ["joint"], nonNegativeAccountIds: ["joint", "savings"] });
    expect(v.result.negativeAccounts).toEqual([{ accountId: "savings", lowest: { month: "2027-01", cents: -50000 } }]);
    expect(v.outcome).toBe("yes_if");
    expect(v.levers).toContainEqual({ kind: "reduce", amountCents: 100000 });
  });
});

describe("affordableAmount", () => {
  it("returns the largest and the comfortable amount on a date", () => {
    // January: 4200 € at month end, nothing lower afterwards; 500 € of margin for the comfortable one.
    expect(affordableAmount(base, { accountId: "joint", date: "2027-01-05" }, { accountIds: ["joint"], uncertaintyCents: 50000 })).toEqual({
      maxCents: 420000,
      comfortableCents: 370000,
    });
  });

  it("grows with extra monthly savings", () => {
    const extra = affordableAmount(base, { accountId: "joint", date: "2027-01-05" }, { accountIds: ["joint"], extraSavings: [{ accountId: "joint", monthlyCents: 10000 }] });
    // Nov, Dec and Jan month ends: +300 €.
    expect(extra.maxCents).toBe(450000);
  });

  it("is null when the balance is already below the floor", () => {
    expect(affordableAmount(base, { accountId: "joint", date: "2027-01-05" }, { accountIds: ["joint"], floorCents: 10_000_000 })).toEqual({ maxCents: null, comfortableCents: null });
  });
});

describe("extraSavingNeeded", () => {
  const plan = { oneOffExpenses: [{ label: "Anticipo", accountId: "joint", amountCents: 450000, date: "2027-01-05" }] };

  it("finds the monthly saving that closes the gap", () => {
    // Short by 300 € at the end of January: 100 € a month over three month ends.
    expect(extraSavingNeeded(base, plan, { accountIds: ["joint"] }, "joint")).toBe(10000);
  });

  it("is 0 when the plan already fits and null when no saving is enough", () => {
    expect(extraSavingNeeded(base, {}, { accountIds: ["joint"] }, "joint")).toBe(0);
    expect(extraSavingNeeded(base, plan, { accountIds: ["joint"], floorCents: 10_000_000 }, "joint", 50_000)).toBeNull();
  });
});
