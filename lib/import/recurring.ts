// Recurring movement proposals: the same merchant in at least three different months becomes a rule
// suggestion (monthly, bimonthly or quarterly), unless an existing rule already covers it.
import { addMonthsToKey, makeDate, monthKey, monthsBetween } from "../domain/dates";
import type { ISODate, RuleFrequency } from "../domain/types";
import { findNoise, merchantKey, merchantLabel, merchantTokens, overlap, withCompounds } from "./merchant";

export interface PastMovement {
  bookedOn: ISODate;
  amountCents: number;
  description: string;
  categoryId?: string | null;
}

export interface ExistingRule {
  amountCents: number;
  frequency: RuleFrequency;
  description?: string;
}

export interface RecurringProposal {
  key: string;
  description: string;
  /** Signed: negative for expenses. */
  amountCents: number;
  frequency: Extract<RuleFrequency, "monthly" | "bimonthly" | "quarterly">;
  dayOfMonth: number;
  /** First due date after the last occurrence, so the rule never repeats imported movements. */
  startDate: ISODate;
  occurrences: number;
  lastDate: ISODate;
  categoryId: string | null;
}

export const MIN_MONTHS = 3;
/** Amount gap within which an existing rule is considered the same commitment. */
const RULE_TOLERANCE = 0.15;
const STEP: Record<number, RecurringProposal["frequency"]> = { 1: "monthly", 2: "bimonthly", 3: "quarterly" };

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

function mostCommon<T>(xs: T[]): T | null {
  const counts = new Map<T, number>();
  let best: T | null = null;
  for (const x of xs) {
    const n = (counts.get(x) ?? 0) + 1;
    counts.set(x, n);
    if (best === null || n > (counts.get(best) ?? 0)) best = x;
  }
  return best;
}

/**
 * An existing rule covers a proposal with a similar amount and the same frequency, or when it names the
 * same merchant (a bill split into two debits, e.g. 26.99 + 8.99 against a 35.98 rule).
 */
function coveredBy(rules: ExistingRule[], amountCents: number, frequency: RuleFrequency, tokens: string[]): boolean {
  return rules.some((r) => {
    if (Math.sign(r.amountCents) !== Math.sign(amountCents)) return false;
    if (r.description && overlap(tokens, merchantTokens(r.description)) >= 0.5) return true;
    return r.frequency === frequency && Math.abs(r.amountCents - amountCents) <= Math.abs(r.amountCents) * RULE_TOLERANCE;
  });
}

/** Proposals still active on `today`: the last occurrence is at most one step plus a month old. */
export function detectRecurring(movements: PastMovement[], rules: ExistingRule[], today: ISODate): RecurringProposal[] {
  const noise = findNoise(movements.map((m) => m.description));
  const groups = new Map<string, PastMovement[]>();
  for (const m of movements) {
    const key = merchantKey(m.description, noise);
    if (!key) continue;
    // Expenses and income of the same merchant are different commitments.
    const k = `${key}|${Math.sign(m.amountCents)}`;
    groups.set(k, [...(groups.get(k) ?? []), m]);
  }

  const out: RecurringProposal[] = [];
  for (const [k, items] of groups) {
    // One occurrence per month: the latest one of that month.
    const byMonth = new Map<string, PastMovement>();
    for (const m of [...items].sort((a, b) => a.bookedOn.localeCompare(b.bookedOn))) byMonth.set(monthKey(m.bookedOn), m);
    const months = [...byMonth.keys()].sort();
    if (months.length < MIN_MONTHS) continue;
    const gaps = months.slice(1).map((m, i) => monthsBetween(months[i], m));
    const step = median(gaps);
    const frequency = STEP[step];
    // Irregular groups (gaps far from the typical step) are not proposed.
    if (!frequency || gaps.some((g) => g > step * 2)) continue;

    // Stopped commitments (e.g. a contract closed years ago) are not proposed.
    if (monthsBetween(months[months.length - 1], monthKey(today)) > step + 1) continue;

    const recent = months.slice(-3).map((m) => byMonth.get(m)!);
    const amountCents = median(recent.map((m) => m.amountCents));
    const last = byMonth.get(months[months.length - 1])!;
    if (coveredBy(rules, amountCents, frequency, withCompounds(merchantTokens(last.description, noise)))) continue;
    const dayOfMonth = median(recent.map((m) => Number(m.bookedOn.slice(8, 10))));
    const [y, mo] = addMonthsToKey(monthKey(last.bookedOn), step).split("-").map(Number);
    out.push({
      key: k,
      description: merchantLabel(last.description, noise),
      amountCents,
      frequency,
      dayOfMonth,
      startDate: makeDate(y, mo, dayOfMonth),
      occurrences: months.length,
      lastDate: last.bookedOn,
      categoryId: mostCommon(items.map((m) => m.categoryId ?? null).filter((c): c is string => !!c)),
    });
  }
  return out.sort((a, b) => a.amountCents - b.amountCents);
}
