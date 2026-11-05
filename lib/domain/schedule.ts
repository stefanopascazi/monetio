import { contributionAmount } from "./contribution";
import { addDays, endOfMonth, makeDate, monthKey, parseISO } from "./dates";
import { occurrences } from "./recurrence";
import type { ContributionRule, ISODate, RecurringRule, Transaction } from "./types";

export const ruleKey = (ruleId: string, date: ISODate) => `r:${ruleId}|${date}`;
export const contributionKey = (ruleId: string, date: ISODate) => `c:${ruleId}|${date}`;

/** Keys of rule/contribution occurrences already turned into transactions. */
export function bookedOccurrences(txns: Pick<Transaction, "recurringRuleId" | "contributionRuleId" | "occurrenceDate">[]): Set<string> {
  const set = new Set<string>();
  for (const t of txns) {
    if (!t.occurrenceDate) continue;
    if (t.recurringRuleId) set.add(ruleKey(t.recurringRuleId, t.occurrenceDate));
    if (t.contributionRuleId) set.add(contributionKey(t.contributionRuleId, t.occurrenceDate));
  }
  return set;
}

export interface DueEntry {
  key: string;
  source: "rule" | "contribution";
  ruleId: string;
  date: ISODate;
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
}

function ruleEntry(r: RecurringRule, date: ISODate, today: ISODate): DueEntry {
  return {
    key: ruleKey(r.id, date),
    source: "rule",
    ruleId: r.id,
    date,
    accountId: r.accountId,
    counterpartAccountId: r.counterpartAccountId,
    categoryId: r.categoryId,
    kind: r.kind,
    description: r.description,
    amountCents: r.amountCents,
    overdue: date < today,
    estimated: false,
  };
}

/** Auto rules whose occurrences up to today are not booked yet. */
export function autoBookings(rules: RecurringRule[], booked: Set<string>, today: ISODate, since: ISODate): DueEntry[] {
  return rules
    .filter((r) => r.active && r.schedule === "auto")
    .flatMap((r) => occurrences(r, since, today).filter((d) => !booked.has(ruleKey(r.id, d))).map((d) => ruleEntry(r, d, today)));
}

/** Spending (positive cents) that a contribution rule shares, for a month. */
export type SpendingLookup = (rule: ContributionRule, month: string) => number;

export function contributionEntry(c: ContributionRule, date: ISODate, today: ISODate, spending: SpendingLookup): DueEntry {
  const month = monthKey(date);
  const future = month > monthKey(today);
  const base = future ? c.estimatedSpendingCents : spending(c, month);
  return {
    key: contributionKey(c.id, date),
    source: "contribution",
    ruleId: c.id,
    date,
    accountId: c.fromAccountId,
    counterpartAccountId: c.toAccountId,
    categoryId: null,
    kind: "transfer",
    description: c.description,
    amountCents: -contributionAmount(c, base),
    overdue: date < today,
    // The current month's share keeps changing until the month closes.
    estimated: future || (month === monthKey(today) && date >= today),
  };
}

function contributionDates(c: ContributionRule, from: ISODate, to: ISODate): ISODate[] {
  return occurrences({ frequency: "monthly", dayOfMonth: c.dayOfMonth, startDate: c.startDate, endDate: c.endDate }, from, to);
}

export interface DueOptions {
  lookbackDays?: number;
  horizonDays?: number;
}

/** Unpaid deadlines (due rules and contributions) from the lookback window to the horizon. */
export function dueEntries(
  rules: RecurringRule[],
  contributions: ContributionRule[],
  booked: Set<string>,
  today: ISODate,
  spending: SpendingLookup,
  { lookbackDays = 90, horizonDays = 31 }: DueOptions = {},
): DueEntry[] {
  const from = addDays(today, -lookbackDays);
  const to = addDays(today, horizonDays);
  const fromRules = rules
    .filter((r) => r.active && r.schedule === "due")
    .flatMap((r) => occurrences(r, from, to).filter((d) => !booked.has(ruleKey(r.id, d))).map((d) => ruleEntry(r, d, today)));
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
    .flatMap((r) => occurrences(r, today, to).filter((d) => !booked.has(ruleKey(r.id, d))).map((d) => ruleEntry(r, d, today)))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Last day of the month that is `months` after today's month. */
export function horizonEnd(today: ISODate, months: number): ISODate {
  const { y, m } = parseISO(today);
  return endOfMonth(makeDate(y, m + months, 1).slice(0, 7));
}
