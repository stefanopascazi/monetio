// "Can we afford it?" verdict for a spending goal: yes, no, or yes if one budget lever is pulled (issue #39).
// Levers stay inside the household budget (docs/ai-advisor.md): postpone, spend less, cut a category.
import { makeDate, monthKey, monthsBetween, parseISO } from "./dates";
import type { ProjectionInput } from "./projection";
import type { ReliabilityLevel } from "./reliability";
import { type ScenarioOptions, type ScenarioResult, simulateScenario } from "./scenario";
import type { ISODate } from "./types";

export interface SpendingGoal {
  label: string;
  accountId: string;
  /** Positive cents. */
  amountCents: number;
  date: ISODate;
}

export interface VerdictOptions extends ScenarioOptions {
  /** Categories the household may cut (discretionary ones). */
  cutCategoryIds?: string[];
  /** Projection uncertainty at the lowest point: a smaller margin over the floor makes the yes "tight". */
  uncertaintyCents?: number;
  reliability?: ReliabilityLevel;
}

export type Lever =
  | { kind: "postpone"; date: ISODate }
  | { kind: "reduce"; amountCents: number }
  | { kind: "cut"; categoryId: string; percent: number };

export type VerdictOutcome = "yes" | "yes_if" | "no";

export interface Verdict {
  outcome: VerdictOutcome;
  /** Simulation of the goal as asked. */
  result: ScenarioResult;
  /** Alternatives that each make the goal feasible on their own. */
  levers: Lever[];
  /** Feasible but closer to the floor than the projection uncertainty. */
  tight: boolean;
  reliability: ReliabilityLevel | null;
}

/** Same day `n` months later, clamped to the month length. */
function addMonths(date: ISODate, n: number): ISODate {
  const { y, m, d } = parseISO(date);
  return makeDate(y, m + n, d);
}

/** Largest value in [lo, hi] for which `ok` holds, assuming `ok` is monotone (true up to a threshold). */
function maxWhere(lo: number, hi: number, ok: (v: number) => boolean): number | null {
  if (!ok(lo)) return null;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ok(mid)) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Verdict on a spending goal, with the budget levers that would make it feasible. */
export function assessGoal(input: ProjectionInput, goal: SpendingGoal, options: VerdictOptions = {}): Verdict {
  const { cutCategoryIds = [], uncertaintyCents = 0, reliability = null, ...scenarioOptions } = options;
  // The horizon must include the goal month, or the expense would never be counted.
  const months = Math.max(input.months, monthsBetween(monthKey(input.today), monthKey(goal.date)) + 1);
  const base = { ...input, months };
  const simulate = (g: SpendingGoal, cut?: { categoryId: string; percent: number }) =>
    simulateScenario(base, { oneOffExpenses: [g], categoryCuts: cut ? [cut] : [] }, scenarioOptions);

  const result = simulate(goal);
  if (result.feasible) {
    const margin = result.lowest.cents - (scenarioOptions.floorCents ?? 0);
    return { outcome: "yes", result, levers: [], tight: margin < uncertaintyCents, reliability };
  }

  const levers: Lever[] = [];
  const horizonEnd = monthKey(addMonths(input.today, months - 1));
  for (let n = 1; monthKey(addMonths(goal.date, n)) <= horizonEnd; n++) {
    const date = addMonths(goal.date, n);
    if (simulate({ ...goal, date }).feasible) {
      levers.push({ kind: "postpone", date });
      break;
    }
  }

  // Whole euros: the advisor talks in round amounts.
  const euros = maxWhere(0, Math.floor(goal.amountCents / 100), (e) => simulate({ ...goal, amountCents: e * 100 }).feasible);
  if (euros) levers.push({ kind: "reduce", amountCents: euros * 100 });

  for (const categoryId of cutCategoryIds) {
    // Smallest cut that works = largest "still infeasible" + 1.
    if (!simulate(goal, { categoryId, percent: 100 }).feasible) continue;
    const below = maxWhere(0, 99, (p) => !simulate(goal, { categoryId, percent: p }).feasible);
    levers.push({ kind: "cut", categoryId, percent: (below ?? -1) + 1 });
  }

  return { outcome: levers.length ? "yes_if" : "no", result, levers, tight: false, reliability };
}
