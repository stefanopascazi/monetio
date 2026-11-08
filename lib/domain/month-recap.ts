// What is still expected on one account before the end of the current month.
import { endOfMonth, monthKey } from "./dates";
import type { Movement, MovementSource } from "./projection";
import type { ISODate } from "./types";

export interface RecapItem {
  date: ISODate;
  label: string;
  source: MovementSource;
  /** Signed (positive = money in). */
  amountCents: number;
  overdue: boolean;
}

export interface MonthRecap {
  /** Date order, overdue first (they are dated today). */
  items: RecapItem[];
  /** Positive cents still to go out. */
  outCents: number;
  /** Positive cents still to come in. */
  inCents: number;
  /** Balance once every remaining outflow is paid, ignoring income. */
  afterOutCents: number;
  /** Balance at month end, income included. */
  closingCents: number;
}

/** Remaining movements of `accountId` up to the end of today's month, with the resulting balances. */
export function accountMonthRecap(movements: Movement[], accountId: string, balanceCents: number, today: ISODate): MonthRecap {
  const last = endOfMonth(monthKey(today));
  const items = movements
    .filter((m) => m.accountId === accountId && m.date <= last && m.amountCents !== 0)
    .map((m) => ({ date: m.date, label: m.label, source: m.source, amountCents: m.amountCents, overdue: m.overdue ?? false }))
    .sort((a, b) => a.date.localeCompare(b.date) || Number(b.overdue) - Number(a.overdue) || a.amountCents - b.amountCents);
  const outCents = items.reduce((s, x) => s + (x.amountCents < 0 ? -x.amountCents : 0), 0);
  const inCents = items.reduce((s, x) => s + (x.amountCents > 0 ? x.amountCents : 0), 0);
  return { items, outCents, inCents, afterOutCents: balanceCents - outCents, closingCents: balanceCents - outCents + inCents };
}
