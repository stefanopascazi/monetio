// "Can we afford it?" verdict for a spending goal: yes, no, or yes if one budget lever is pulled (issue #39).
// Levers stay inside the household budget (docs/ai-advisor.md): postpone, spend less, save more, cut a category.
import { makeDate, monthKey, monthsBetween, parseISO } from "./dates";
import type { ProjectionInput } from "./projection";
import type { ReliabilityLevel } from "./reliability";
import { type ExtraSaving, type Scenario, type ScenarioOptions, type ScenarioResult, simulateScenario } from "./scenario";
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
  | { kind: "save"; monthlyCents: number }
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

/** Smallest value in [lo, hi] for which `ok` holds, assuming it stays true above a threshold. */
function minWhere(lo: number, hi: number, ok: (v: number) => boolean): number | null {
  if (!ok(hi)) return null;
  const below = maxWhere(lo, hi, (v) => !ok(v));
  return below === null ? lo : below + 1;
}

/** Horizon long enough to include the goal month, or the expense would never be counted. */
function withGoalMonth(input: ProjectionInput, date: ISODate): ProjectionInput {
  return { ...input, months: Math.max(input.months, monthsBetween(monthKey(input.today), monthKey(date)) + 1) };
}

/** Verdict on a spending goal, with the budget levers that would make it feasible. */
export function assessGoal(input: ProjectionInput, goal: SpendingGoal, options: VerdictOptions = {}): Verdict {
  const { cutCategoryIds = [], uncertaintyCents = 0, reliability = null, ...scenarioOptions } = options;
  const base = withGoalMonth(input, goal.date);
  const simulate = (g: SpendingGoal, extra: { cut?: { categoryId: string; percent: number }; save?: number } = {}) =>
    simulateScenario(
      base,
      {
        oneOffExpenses: [g],
        categoryCuts: extra.cut ? [extra.cut] : [],
        extraSavings: extra.save ? [{ accountId: g.accountId, monthlyCents: extra.save }] : [],
      },
      scenarioOptions,
    );

  const result = simulate(goal);
  if (result.feasible) {
    const margin = result.lowest.cents - (scenarioOptions.floorCents ?? 0);
    return { outcome: "yes", result, levers: [], tight: margin < uncertaintyCents, reliability };
  }

  const levers: Lever[] = [];
  const horizonEnd = monthKey(addMonths(input.today, base.months - 1));
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

  // Saving more each month from now on, in steps of 10 €, capped at the goal itself.
  const tens = minWhere(1, Math.ceil(goal.amountCents / 1000), (t) => simulate(goal, { save: t * 1000 }).feasible);
  if (tens) levers.push({ kind: "save", monthlyCents: tens * 1000 });

  for (const categoryId of cutCategoryIds) {
    const percent = minWhere(1, 100, (p) => simulate(goal, { cut: { categoryId, percent: p } }).feasible);
    if (percent) levers.push({ kind: "cut", categoryId, percent });
  }

  return { outcome: levers.length ? "yes_if" : "no", result, levers, tight: false, reliability };
}

export interface Affordable {
  /** Largest amount that keeps every check green, whole euros in cents; null when even 0 fails. */
  maxCents: number | null;
  /** Largest amount that also keeps a margin equal to the projection uncertainty. */
  comfortableCents: number | null;
}

export interface AffordableOptions extends ScenarioOptions {
  uncertaintyCents?: number;
  extraSavings?: ExtraSaving[];
}

/** Upper bound of the search: well above any household's means (1 million euros). */
const MAX_EUROS = 1_000_000;

/** How much could be spent from an account on a date: the answer to "how big a purchase?". */
export function affordableAmount(input: ProjectionInput, when: { accountId: string; date: ISODate }, options: AffordableOptions = {}): Affordable {
  const { uncertaintyCents = 0, extraSavings = [], ...scenarioOptions } = options;
  const base = withGoalMonth(input, when.date);
  const fits = (euros: number, floorCents: number) =>
    simulateScenario(
      base,
      { oneOffExpenses: [{ label: "Acquisto", accountId: when.accountId, amountCents: euros * 100, date: when.date }], extraSavings },
      { ...scenarioOptions, floorCents },
    ).feasible;
  const floor = scenarioOptions.floorCents ?? 0;
  const max = maxWhere(0, MAX_EUROS, (e) => fits(e, floor));
  const comfortable = maxWhere(0, MAX_EUROS, (e) => fits(e, floor + uncertaintyCents));
  return { maxCents: max === null ? null : max * 100, comfortableCents: comfortable === null ? null : comfortable * 100 };
}

/**
 * Smallest extra monthly saving (steps of 10 €, from now on, on `accountId`) that makes a scenario feasible:
 * the "yes, if" of a plan the user brought (e.g. a payment plan). Null when even `maxMonthlyCents` is not enough.
 */
export function extraSavingNeeded(
  input: ProjectionInput,
  scenario: Scenario,
  options: ScenarioOptions,
  accountId: string,
  maxMonthlyCents = 300_000,
): number | null {
  const fits = (tens: number) =>
    simulateScenario(input, { ...scenario, extraSavings: [...(scenario.extraSavings ?? []), { accountId, monthlyCents: tens * 1000 }] }, options).feasible;
  if (simulateScenario(input, scenario, options).feasible) return 0;
  const tens = minWhere(1, Math.floor(maxMonthlyCents / 1000), fits);
  return tens === null ? null : tens * 1000;
}
