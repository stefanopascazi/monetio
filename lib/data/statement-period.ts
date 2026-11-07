// Period shown in the account statement, parsed from search params.
import { addMonthsToKey, dateLabel, endOfMonth, monthLabel, startOfMonth } from "../domain/dates";
import type { ISODate } from "../domain/types";
import { dateParam, monthParam, pageSizeParam } from "./params";

/** Rows shown at first and added by each "Mostra altri": keeps the default query light. */
export const RECENT_LIMIT = 30;

/** `limit`: newest rows shown (from the `n` param); the rest is behind "Mostra altri". */
export type StatementPeriod =
  | { kind: "recent"; limit: number }
  | { kind: "month"; month: string; from: ISODate; to: ISODate; limit: number }
  | { kind: "range"; from: ISODate; to: ISODate; limit: number };

type Params = Record<string, string | string[] | undefined>;

/**
 * Exact dates (`da`/`a`) win over `mese`; with no filter, the latest rows.
 * A half-open range is closed with the account opening date or today; reversed bounds are swapped.
 */
export function statementPeriod(sp: Params, today: ISODate, firstDate: ISODate): StatementPeriod {
  const limit = pageSizeParam(sp.n, RECENT_LIMIT);
  const da = dateParam(sp.da);
  const a = dateParam(sp.a);
  if (da || a) {
    const from = da ?? firstDate;
    const to = a ?? today;
    return from <= to ? { kind: "range", from, to, limit } : { kind: "range", from: to, to: from, limit };
  }
  const month = monthParam(sp.mese, "");
  if (month) return { kind: "month", month, from: startOfMonth(month), to: endOfMonth(month), limit };
  return { kind: "recent", limit };
}

/** Query params that reproduce the period (without the page size). */
export function periodQuery(p: StatementPeriod): Record<string, string> {
  if (p.kind === "month") return { mese: p.month };
  if (p.kind === "range") return { da: p.from, a: p.to };
  return {};
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
