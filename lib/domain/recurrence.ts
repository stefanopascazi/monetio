import { addDays, daysBetween, makeDate, parseISO } from "./dates";
import type { ISODate, RuleFrequency } from "./types";

export const FREQUENCY_MONTHS: Record<Exclude<RuleFrequency, "weekly">, number> = {
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  semiannual: 6,
  yearly: 12,
};

export interface Schedule {
  frequency: RuleFrequency;
  dayOfMonth: number;
  startDate: ISODate;
  endDate: ISODate | null;
}

/**
 * Occurrence dates of a schedule within [from, to] (inclusive).
 * Month-based schedules step from the start month on `dayOfMonth` (clamped to month end);
 * weekly schedules step 7 days from the start date.
 */
export function occurrences(s: Schedule, from: ISODate, to: ISODate): ISODate[] {
  const last = s.endDate && s.endDate < to ? s.endDate : to;
  if (last < from || last < s.startDate) return [];
  const out: ISODate[] = [];

  if (s.frequency === "weekly") {
    let d = s.startDate;
    if (d < from) d = addDays(d, Math.ceil(daysBetween(d, from) / 7) * 7);
    for (; d <= last; d = addDays(d, 7)) out.push(d);
    return out;
  }

  const step = FREQUENCY_MONTHS[s.frequency];
  const start = parseISO(s.startDate);
  const f = parseISO(from);
  const monthsToFrom = (f.y - start.y) * 12 + (f.m - start.m);
  // Jump close to `from` to avoid iterating decades of history.
  let i = monthsToFrom > step ? Math.floor(monthsToFrom / step) - 1 : 0;
  for (;; i++) {
    const d = makeDate(start.y, start.m + i * step, s.dayOfMonth);
    if (d > last) break;
    if (d >= from && d >= s.startDate) out.push(d);
  }
  return out;
}

/** Next occurrence on or after `from`, or null when the schedule has ended. */
export function nextOccurrence(s: Schedule, from: ISODate): ISODate | null {
  const { y, m } = parseISO(from);
  return occurrences(s, from, makeDate(y + 2, m, 28))[0] ?? null;
}

/** First occurrence on or after the start date (the real "first due date" of a rule). */
export function firstOccurrence(s: Schedule): ISODate | null {
  return nextOccurrence(s, s.startDate);
}

/**
 * Day of month anchored by a first due date. When the date falls on the last day of its
 * month, a larger preferred day (e.g. 31) is kept so later months still land on month end.
 */
export function anchorDay(firstDate: ISODate, preferredDay?: number): number {
  const { y, m, d } = parseISO(firstDate);
  const isMonthEnd = makeDate(y, m, 31) === firstDate;
  return isMonthEnd && preferredDay && preferredDay > d && preferredDay <= 31 ? preferredDay : d;
}
