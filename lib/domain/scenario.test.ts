import { describe, expect, it } from "vitest";
import { rule } from "./fixtures";
import { type ProjectionInput, projectBalances } from "./projection";
import { lowestPoint, scenarioMovements, simulateScenario } from "./scenario";

const base: ProjectionInput = {
  today: "2026-11-05",
  months: 4,
  balances: { joint: 300000, savings: 100000 },
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

const joint = (months: { byAccount: Record<string, number> }[]) => months.map((m) => m.byAccount.joint);

describe("simulateScenario", () => {
  it("matches the plain projection with an empty scenario", () => {
    const res = simulateScenario(base, {});
    expect(res.scenario).toEqual(projectBalances(base));
    expect(res.baseline).toEqual(res.scenario);
    expect(res.feasible).toBe(true);
  });

  it("subtracts a one-off expense from its month on", () => {
    const res = simulateScenario(base, { oneOffExpenses: [{ date: "2027-01-10", accountId: "joint", amountCents: 300000, label: "Vacanza" }] });
    const delta = joint(res.scenario).map((v, i) => v - joint(res.baseline)[i]);
    expect(delta).toEqual([0, 0, -300000, -300000]);
  });

  it("moves a past one-off expense to today", () => {
    const [m] = scenarioMovements({ ...base, rules: [] }, { oneOffExpenses: [{ date: "2026-10-01", accountId: "joint", amountCents: 5000, label: "x" }] });
    expect(m).toMatchObject({ date: "2026-11-05", amountCents: -5000 });
  });

  it("cuts only the expenses of the category from the given date", () => {
    const res = simulateScenario(base, { categoryCuts: [{ categoryId: "food", percent: 25, from: "2026-12-01" }] });
    const delta = joint(res.scenario).map((v, i) => v - joint(res.baseline)[i]);
    // 15000 saved per month from December; the mortgage is untouched.
    expect(delta).toEqual([0, 15000, 30000, 45000]);
  });

  it("clamps the cut percentage to 0–100", () => {
    const res = simulateScenario(base, { categoryCuts: [{ categoryId: "food", percent: 150 }] });
    const delta = joint(res.scenario).map((v, i) => v - joint(res.baseline)[i]);
    expect(delta).toEqual([60000, 120000, 180000, 240000]);
  });

  it("moves a saving plan to its account and keeps the total", () => {
    const plan = { fromAccountId: "joint", toAccountId: "savings", monthlyCents: 25000, dayOfMonth: 27, startDate: "2026-11-01", endDate: null, label: "Accantonamento vacanza" };
    const res = simulateScenario(base, { savingPlans: [plan] });
    expect(res.scenario.map((m) => m.byAccount.savings)).toEqual([125000, 150000, 175000, 200000]);
    expect(res.scenario.map((m) => m.totalCents)).toEqual(res.baseline.map((m) => m.totalCents));
  });

  it("takes a saving plan without destination out of the total", () => {
    const plan = { fromAccountId: "joint", toAccountId: null, monthlyCents: 10000, dayOfMonth: 1, startDate: "2026-12-01", endDate: "2027-01-31", label: "Da parte" };
    const res = simulateScenario(base, { savingPlans: [plan] });
    const delta = res.scenario.map((m, i) => m.totalCents - res.baseline[i].totalCents);
    expect(delta).toEqual([0, -10000, -20000, -20000]);
  });

  it("reports the shortfall below the floor on the chosen accounts", () => {
    const holiday = { date: "2026-12-01", accountId: "joint", amountCents: 500000, label: "Vacanza" };
    const res = simulateScenario(base, { oneOffExpenses: [holiday] }, { accountIds: ["joint"], floorCents: 50000 });
    // Joint at end of December: 340000 + 40000 - 500000 = -120000.
    expect(res.lowest).toEqual({ month: "2026-12", cents: -120000 });
    expect(res.shortfallCents).toBe(170000);
    expect(res.feasible).toBe(false);
    expect(res.baselineLowest).toEqual({ month: "2026-11", cents: 340000 });
  });
});

describe("simulateScenario extra savings", () => {
  it("adds the unspent amount at each month end from the given month", () => {
    const res = simulateScenario(base, { extraSavings: [{ accountId: "joint", monthlyCents: 10000, from: "2026-12-10" }] });
    const delta = joint(res.scenario).map((v, i) => v - joint(res.baseline)[i]);
    expect(delta).toEqual([0, 10000, 20000, 30000]);
  });
});

describe("lowestPoint", () => {
  it("returns zero on an empty projection", () => {
    expect(lowestPoint([])).toEqual({ month: "", cents: 0 });
  });
});
