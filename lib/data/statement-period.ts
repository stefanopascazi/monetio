// Period shown in the account statement, parsed from search params.
import { addMonthsToKey, dateLabel, endOfMonth, monthLabel, startOfMonth } from "../domain/dates";
import type { ISODate } from "../domain/types";
import { dateParam, monthParam } from "./params";

/** Rows shown when no filter is set: keeps the default query light. */
export const RECENT_LIMIT = 30;

export type StatementPeriod =
  | { kind: "recent"; limit: number }
  | { kind: "month"; month: string; from: ISODate; to: ISODate }
  | { kind: "range"; from: ISODate; to: ISODate };

type Params = Record<string, string | string[] | undefined>;

/**
 * Exact dates (`da`/`a`) win over `mese`; with no filter, the latest rows.
 * A half-open range is closed with the account opening date or today; reversed bounds are swapped.
 */
export function statementPeriod(sp: Params, today: ISODate, firstDate: ISODate): StatementPeriod {
  const da = dateParam(sp.da);
  const a = dateParam(sp.a);
  if (da || a) {
    const from = da ?? firstDate;
    const to = a ?? today;
    return from <= to ? { kind: "range", from, to } : { kind: "range", from: to, to: from };
  }
  const month = monthParam(sp.mese, "");
  if (month) return { kind: "month", month, from: startOfMonth(month), to: endOfMonth(month) };
  return { kind: "recent", limit: RECENT_LIMIT };
}

/** Human label for the period, used in titles and empty states. */
export function periodLabel(p: StatementPeriod): string {
  if (p.kind === "recent") return `Ultimi ${p.limit} movimenti`;
  if (p.kind === "month") return monthLabel(p.month, true);
  return `Dal ${dateLabel(p.from)} al ${dateLabel(p.to)}`;
}

/** Adjacent months for month navigation, bounded by the given month keys. */
export function adjacentMonths(month: string, min: string, max: string): { prev: string | null; next: string | null } {
  const prev = addMonthsToKey(month, -1);
  const next = addMonthsToKey(month, 1);
  return { prev: prev >= min ? prev : null, next: next <= max ? next : null };
}
