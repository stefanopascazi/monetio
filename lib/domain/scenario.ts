// What-if simulations on top of the deterministic projection (foundation of the AI advisor, issue #39).
// The model never computes numbers: it only picks levers, this module returns the balances.
import { addMonthsToKey, endOfMonth, monthKey } from "./dates";
import { balancesFromMovements, type Movement, type ProjectionInput, type ProjectionMonth, projectedMovements } from "./projection";
import { occurrences } from "./recurrence";
import type { ISODate } from "./types";

/** A single extra expense (e.g. a holiday). */
export interface OneOffExpense {
  date: ISODate;
  accountId: string;
  /** Positive cents. */
  amountCents: number;
  label: string;
}

/** Reduce the expected expenses of a category by a percentage. */
export interface CategoryCut {
  categoryId: string;
  /** 0–100. */
  percent: number;
  /** First day the cut applies; defaults to today. */
  from?: ISODate;
}

/** Monthly set-aside: a transfer to another account, or money kept aside when `toAccountId` is null. */
export interface SavingPlan {
  fromAccountId: string;
  toAccountId: string | null;
  /** Positive cents per month. */
  monthlyCents: number;
  dayOfMonth: number;
  startDate: ISODate;
  endDate: ISODate | null;
  label: string;
}

export interface Scenario {
  oneOffExpenses?: OneOffExpense[];
  categoryCuts?: CategoryCut[];
  savingPlans?: SavingPlan[];
}

export interface ScenarioOptions {
  /** Accounts the verdict looks at (e.g. liquid ones); defaults to every account in the projection. */
  accountIds?: string[];
  /** Lowest acceptable month-end total of those accounts. */
  floorCents?: number;
}

export interface LowestPoint {
  month: string;
  cents: number;
}

export interface ScenarioResult {
  baseline: ProjectionMonth[];
  scenario: ProjectionMonth[];
  baselineLowest: LowestPoint;
  lowest: LowestPoint;
  /** How much is missing to stay above the floor (0 when feasible). */
  shortfallCents: number;
  feasible: boolean;
}

/** Projection movements with the scenario's levers applied. */
export function scenarioMovements(input: ProjectionInput, scenario: Scenario): Movement[] {
  const { today } = input;
  const cuts = (scenario.categoryCuts ?? []).map((c) => ({ ...c, percent: Math.min(100, Math.max(0, c.percent)), from: c.from ?? today }));
  const out = projectedMovements(input).map((m) => {
    // Only plain expenses: a transfer between accounts is not spending.
    if (m.amountCents >= 0 || m.counterpartId || !m.categoryId) return m;
    const cut = cuts.find((c) => c.categoryId === m.categoryId && m.date >= c.from);
    return cut ? { ...m, amountCents: Math.round((m.amountCents * (100 - cut.percent)) / 100) } : m;
  });

  for (const e of scenario.oneOffExpenses ?? []) {
    out.push({ date: e.date < today ? today : e.date, accountId: e.accountId, amountCents: -Math.abs(e.amountCents), label: e.label, source: "planned" });
  }

  const end = endOfMonth(addMonthsToKey(monthKey(today), input.months - 1));
  for (const p of scenario.savingPlans ?? []) {
    const amount = -Math.abs(p.monthlyCents);
    const rule = { frequency: "monthly" as const, dayOfMonth: p.dayOfMonth, startDate: p.startDate, endDate: p.endDate };
    for (const date of occurrences(rule, today, end)) {
      out.push({ date, accountId: p.fromAccountId, amountCents: amount, label: p.label, source: "planned", ...(p.toAccountId ? { counterpartId: p.toAccountId } : {}) });
      if (p.toAccountId) out.push({ date, accountId: p.toAccountId, amountCents: -amount, label: p.label, source: "planned", counterpartId: p.fromAccountId });
    }
  }
  return out;
}

/** Lowest month-end total of the given accounts (all accounts when omitted). */
export function lowestPoint(months: ProjectionMonth[], accountIds?: string[]): LowestPoint {
  let lowest: LowestPoint = { month: months[0]?.month ?? "", cents: Number.POSITIVE_INFINITY };
  for (const m of months) {
    const cents = accountIds ? accountIds.reduce((s, id) => s + (m.byAccount[id] ?? 0), 0) : m.totalCents;
    if (cents < lowest.cents) lowest = { month: m.month, cents };
  }
  return Number.isFinite(lowest.cents) ? lowest : { month: lowest.month, cents: 0 };
}

/** Baseline vs scenario balances and whether the scope stays above the floor. */
export function simulateScenario(input: ProjectionInput, scenario: Scenario, options: ScenarioOptions = {}): ScenarioResult {
  const { accountIds, floorCents = 0 } = options;
  const baseline = balancesFromMovements(input, projectedMovements(input));
  const simulated = balancesFromMovements(input, scenarioMovements(input, scenario));
  const lowest = lowestPoint(simulated, accountIds);
  const shortfallCents = Math.max(0, floorCents - lowest.cents);
  return {
    baseline,
    scenario: simulated,
    baselineLowest: lowestPoint(baseline, accountIds),
    lowest,
    shortfallCents,
    feasible: shortfallCents === 0,
  };
}
