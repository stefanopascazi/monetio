// What is still expected on one account in a month, with its opening and closing balances.
import { endOfMonth, monthKey, startOfMonth } from "./dates";
import type { Movement, MovementSource } from "./projection";
import type { EstimateUsage } from "./estimates";
import type { ISODate } from "./types";

export interface RecapItem {
  key: string;
  date: ISODate;
  label: string;
  source: MovementSource;
  /** Signed (positive = money in). */
  amountCents: number;
  overdue: boolean;
  /** Estimates and rule occurrences: occurrence key, to close, book or edit it. */
  ref?: string;
  /** Rule occurrences: effective due date and the actual amount/date entered. */
  occurrence?: Movement["occurrence"];
  /** Planned transactions: their id. */
  txnId?: string;
  /** Decreasing estimates: booked movements that reduced them this month. */
  usage?: EstimateUsage;
}

export interface RecapTotals {
  /** Positive cents out. */
  outCents: number;
  /** Positive cents in. */
  inCents: number;
}

export interface MonthRecap {
  /** `YYYY-MM` of the recap. */
  month: string;
  /** Current balance for this month, previous month's closing for later ones. */
  openingCents: number;
  /** Still expected until month end, in date order (overdue first, dated today). */
  due: RecapItem[];
  dueTotals: RecapTotals;
  /** Balance at month end, income included. */
  closingCents: number;
}

const totals = (items: RecapItem[]): RecapTotals => ({
  outCents: items.reduce((s, x) => s + (x.amountCents < 0 ? -x.amountCents : 0), 0),
  inCents: items.reduce((s, x) => s + (x.amountCents > 0 ? x.amountCents : 0), 0),
});

/**
 * Month recap of `accountId` for `month` (today's month by default): projected movements in it. A future month starts from the previous month's closing balance,
 * i.e. the current balance plus every projected movement before it.
 */
export function accountMonthRecap(
  movements: Movement[],
  accountId: string,
  balanceCents: number,
  today: ISODate,
  month: string = monthKey(today),
): MonthRecap {
  const first = startOfMonth(month);
  const last = endOfMonth(month);
  const own = movements.filter((m) => m.accountId === accountId && (m.amountCents !== 0 || m.usage));
  // Booked rows are already in the balance: only earlier projected movements move the opening.
  const openingCents = balanceCents + own.filter((m) => m.date < first).reduce((s, m) => s + m.amountCents, 0);
  const due = own
    .filter((m) => m.date >= first && m.date <= last)
    .map((m, i) => ({ key: `m${i}`, date: m.date, label: m.label, source: m.source, amountCents: m.amountCents, overdue: m.overdue ?? false, ...(m.ref ? { ref: m.ref } : {}), ...(m.usage ? { usage: m.usage } : {}), ...(m.occurrence ? { occurrence: m.occurrence } : {}), ...(m.txnId ? { txnId: m.txnId } : {}) }))
    .sort((a, b) => a.date.localeCompare(b.date) || Number(b.overdue) - Number(a.overdue) || a.amountCents - b.amountCents);
  const dueTotals = totals(due);
  return { month, openingCents, due, dueTotals, closingCents: openingCents - dueTotals.outCents + dueTotals.inCents };
}
