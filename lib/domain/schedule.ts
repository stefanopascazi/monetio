import { type ContributionSpending, contributionAmount, contributionBase } from "./contribution";
import { addDays, endOfMonth, makeDate, monthKey, parseISO } from "./dates";
import { occurrences } from "./recurrence";
import type { ContributionRule, ISODate, OccurrenceOverride, RecurringRule, RuleFrequency, Transaction } from "./types";

/**
 * Period an occurrence belongs to: its month for month-based schedules, the date for weekly ones.
 * Matching payments by period (not exact date) keeps an item paid when its day is edited later.
 */
export const occurrencePeriod = (date: ISODate, frequency: RuleFrequency = "monthly") => (frequency === "weekly" ? date : monthKey(date));

export const ruleKey = (ruleId: string, date: ISODate, frequency: RuleFrequency = "monthly") => `r:${ruleId}|${occurrencePeriod(date, frequency)}`;
export const contributionKey = (ruleId: string, date: ISODate) => `c:${ruleId}|${monthKey(date)}`;

/** Keys of rule/contribution occurrences already turned into transactions. */
export function bookedOccurrences(
  txns: Pick<Transaction, "recurringRuleId" | "contributionRuleId" | "occurrenceDate">[],
  rules: Pick<RecurringRule, "id" | "frequency">[] = [],
): Set<string> {
  const freq = new Map(rules.map((r) => [r.id, r.frequency]));
  const set = new Set<string>();
  for (const t of txns) {
    if (!t.occurrenceDate) continue;
    if (t.recurringRuleId) set.add(ruleKey(t.recurringRuleId, t.occurrenceDate, freq.get(t.recurringRuleId)));
    if (t.contributionRuleId) set.add(contributionKey(t.contributionRuleId, t.occurrenceDate));
  }
  return set;
}

export type OverrideMap = Map<string, OccurrenceOverride>;

/** Overrides keyed like rule occurrences (`r:<rule>|<period>`). */
export function overrideMap(list: OccurrenceOverride[]): OverrideMap {
  return new Map(list.map((o) => [`r:${o.ruleId}|${o.period}`, o]));
}

export interface DueEntry {
  key: string;
  source: "rule" | "contribution";
  ruleId: string;
  /** Effective due date (the actual one when entered, otherwise the scheduled one). */
  date: ISODate;
  /** Scheduled occurrence date: links the payment to its period. */
  occurrenceDate: ISODate;
  accountId: string;
  counterpartAccountId: string | null;
  categoryId: string | null;
  kind: "income" | "expense" | "transfer";
  description: string;
  /** Signed from the point of view of accountId. */
  amountCents: number;
  overdue: boolean;
  /** Amount still depends on spending not yet booked. */
  estimated: boolean;
  /** Actual amount/date entered for this occurrence (e.g. the bill arrived). */
  confirmed: boolean;
  note?: string | null;
}

function ruleEntry(r: RecurringRule, date: ISODate, today: ISODate, overrides?: OverrideMap): DueEntry {
  const key = ruleKey(r.id, date, r.frequency);
  const o = overrides?.get(key);
  const effective = o?.dueDate ?? date;
  return {
    key,
    source: "rule",
    ruleId: r.id,
    date: effective,
    occurrenceDate: date,
    accountId: r.accountId,
    counterpartAccountId: r.counterpartAccountId,
    categoryId: r.categoryId,
    kind: r.kind,
    description: r.description,
    amountCents: o?.amountCents ?? r.amountCents,
    overdue: effective < today,
    estimated: false,
    confirmed: !!o,
    note: o?.note ?? null,
  };
}

/** Auto rules whose occurrences up to today are not booked yet. */
export function autoBookings(rules: RecurringRule[], booked: Set<string>, today: ISODate, since: ISODate): DueEntry[] {
  return rules
    .filter((r) => r.active && r.schedule === "auto")
    .flatMap((r) => occurrences(r, since, today).filter((d) => !booked.has(ruleKey(r.id, d, r.frequency))).map((d) => ruleEntry(r, d, today)));
}

/** Spending (positive cents) that a contribution rule shares, for a month. */
export type SpendingLookup = ContributionSpending;

export function contributionEntry(c: ContributionRule, date: ISODate, today: ISODate, spending: SpendingLookup): DueEntry {
  const { baseCents, estimated } = contributionBase(c, monthKey(date), monthKey(today), spending);
  return {
    key: contributionKey(c.id, date),
    source: "contribution",
    ruleId: c.id,
    date,
    occurrenceDate: date,
    accountId: c.fromAccountId,
    counterpartAccountId: c.toAccountId,
    categoryId: null,
    kind: "transfer",
    description: c.description,
    amountCents: -contributionAmount(c, baseCents),
    overdue: date < today,
    // The share keeps changing until the referenced month closes.
    estimated,
    confirmed: false,
  };
}

function contributionDates(c: ContributionRule, from: ISODate, to: ISODate): ISODate[] {
  return occurrences({ frequency: "monthly", dayOfMonth: c.dayOfMonth, startDate: c.startDate, endDate: c.endDate }, from, to);
}

export interface DueOptions {
  lookbackDays?: number;
  horizonDays?: number;
  overrides?: OverrideMap;
}

/** Unpaid deadlines (due rules and contributions) from the lookback window to the horizon. */
export function dueEntries(
  rules: RecurringRule[],
  contributions: ContributionRule[],
  booked: Set<string>,
  today: ISODate,
  spending: SpendingLookup,
  { lookbackDays = 90, horizonDays = 31, overrides }: DueOptions = {},
): DueEntry[] {
  const from = addDays(today, -lookbackDays);
  const to = addDays(today, horizonDays);
  const fromRules = rules
    .filter((r) => r.active && r.schedule === "due")
    .flatMap((r) => occurrences(r, from, to).filter((d) => !booked.has(ruleKey(r.id, d, r.frequency))).map((d) => ruleEntry(r, d, today, overrides)));
  const fromContributions = contributions
    .filter((c) => c.active)
    .flatMap((c) =>
      contributionDates(c, from, to)
        .filter((d) => !booked.has(contributionKey(c.id, d)))
        .map((d) => contributionEntry(c, d, today, spending)),
    );
  return [...fromRules, ...fromContributions].sort((a, b) => a.date.localeCompare(b.date));
}

/** Upcoming occurrences of all active rules (any schedule) in the next days, for the agenda. */
export function upcomingOccurrences(rules: RecurringRule[], booked: Set<string>, today: ISODate, days: number): DueEntry[] {
  const to = addDays(today, days);
  return rules
    .filter((r) => r.active)
    .flatMap((r) => occurrences(r, today, to).filter((d) => !booked.has(ruleKey(r.id, d, r.frequency))).map((d) => ruleEntry(r, d, today)))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Last day of the month that is `months` after today's month. */
export function horizonEnd(today: ISODate, months: number): ISODate {
  const { y, m } = parseISO(today);
  return endOfMonth(makeDate(y, m + months, 1).slice(0, 7));
}
