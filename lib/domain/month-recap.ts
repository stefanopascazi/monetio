// Everything happening on one account in the current month: what is paid and what is still due.
import { endOfMonth, monthKey } from "./dates";
import type { Movement, MovementSource } from "./projection";
import type { ISODate, Transaction } from "./types";

export interface RecapItem {
  key: string;
  date: ISODate;
  label: string;
  /** "booked" for movements already in the balance. */
  source: MovementSource | "booked";
  /** Signed (positive = money in). */
  amountCents: number;
  overdue: boolean;
}

export interface RecapTotals {
  /** Positive cents out. */
  outCents: number;
  /** Positive cents in. */
  inCents: number;
}

export interface MonthRecap {
  /** Booked this month, newest first. */
  paid: RecapItem[];
  /** Still expected until month end, in date order (overdue first, dated today). */
  due: RecapItem[];
  paidTotals: RecapTotals;
  dueTotals: RecapTotals;
  /** Balance once every remaining outflow is paid, ignoring income. */
  afterOutCents: number;
  /** Balance at month end, income included. */
  closingCents: number;
}

const totals = (items: RecapItem[]): RecapTotals => ({
  outCents: items.reduce((s, x) => s + (x.amountCents < 0 ? -x.amountCents : 0), 0),
  inCents: items.reduce((s, x) => s + (x.amountCents > 0 ? x.amountCents : 0), 0),
});

/** Month recap of `accountId`: booked rows of today's month plus projected movements until its end. */
export function accountMonthRecap(
  movements: Movement[],
  booked: Pick<Transaction, "id" | "accountId" | "status" | "bookedOn" | "description" | "amountCents">[],
  accountId: string,
  balanceCents: number,
  today: ISODate,
): MonthRecap {
  const month = monthKey(today);
  const last = endOfMonth(month);
  const paid = booked
    .filter((t) => t.accountId === accountId && t.status === "booked" && monthKey(t.bookedOn) === month && t.amountCents !== 0)
    .map((t) => ({ key: t.id, date: t.bookedOn, label: t.description, source: "booked" as const, amountCents: t.amountCents, overdue: false }))
    .sort((a, b) => b.date.localeCompare(a.date));
  const due = movements
    .filter((m) => m.accountId === accountId && m.date <= last && m.amountCents !== 0)
    .map((m, i) => ({ key: `m${i}`, date: m.date, label: m.label, source: m.source, amountCents: m.amountCents, overdue: m.overdue ?? false }))
    .sort((a, b) => a.date.localeCompare(b.date) || Number(b.overdue) - Number(a.overdue) || a.amountCents - b.amountCents);
  const dueTotals = totals(due);
  const afterOutCents = balanceCents - dueTotals.outCents;
  return { paid, due, paidTotals: totals(paid), dueTotals, afterOutCents, closingCents: afterOutCents + dueTotals.inCents };
}
