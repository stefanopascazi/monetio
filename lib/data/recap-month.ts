// Month shown in the account recap, parsed from the `proiezione` search param.
import { addMonthsToKey, monthKey } from "../domain/dates";
import type { ISODate } from "../domain/types";
import { monthParam } from "./params";
import { adjacentMonths } from "./statement-period";

/** Months the recap can show: the current one and the following ones. */
export const RECAP_MONTHS = 12;

/** Requested month clamped to [current month, current + RECAP_MONTHS - 1]. */
export function recapMonth(v: string | string[] | undefined, today: ISODate): string {
  const current = monthKey(today);
  const last = addMonthsToKey(current, RECAP_MONTHS - 1);
  const m = monthParam(v, current);
  return m < current ? current : m > last ? last : m;
}

/** Adjacent recap months, null outside the allowed window. */
export function recapNav(month: string, today: ISODate): { prev: string | null; next: string | null } {
  const current = monthKey(today);
  return adjacentMonths(month, current, addMonthsToKey(current, RECAP_MONTHS - 1));
}
