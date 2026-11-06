import { monthKey } from "./dates";
import type { ISODate, Transaction } from "./types";

export interface StatementRow extends Transaction {
  balanceAfterCents: number;
}

/** Stable chronological order: date, then id. */
export function sortChronological<T extends Pick<Transaction, "bookedOn" | "id">>(txns: T[]): T[] {
  return [...txns].sort((a, b) => (a.bookedOn === b.bookedOn ? a.id.localeCompare(b.id) : a.bookedOn < b.bookedOn ? -1 : 1));
}

/** Booked transactions with the running balance after each one, oldest first. */
export function withRunningBalance(openingCents: number, txns: Transaction[]): StatementRow[] {
  let balance = openingCents;
  return sortChronological(txns.filter((t) => t.status === "booked")).map((t) => {
    balance += t.amountCents;
    return { ...t, balanceAfterCents: balance };
  });
}

/**
 * Running balance for a partial window (e.g. the latest N rows), anchored on the balance
 * after its newest row: the opening is derived by subtracting the window's rows.
 */
export function withRunningBalanceToClosing(closingCents: number, txns: Transaction[]): StatementRow[] {
  const booked = txns.filter((t) => t.status === "booked");
  const opening = booked.reduce((s, t) => s - t.amountCents, closingCents);
  return withRunningBalance(opening, booked);
}

/** Balance at the end of `date` (inclusive). */
export function balanceAt(openingCents: number, txns: Transaction[], date: ISODate): number {
  return txns.filter((t) => t.status === "booked" && t.bookedOn <= date).reduce((s, t) => s + t.amountCents, openingCents);
}

export interface MonthTotals {
  month: string;
  incomeCents: number;
  /** Positive cents. */
  expenseCents: number;
}

/**
 * Income and expense per month, ignoring transfers between the given accounts
 * (money moving inside the household is neither earned nor spent).
 */
export function monthlyTotals(txns: Transaction[], internalAccountIds: Set<string>): MonthTotals[] {
  const map = new Map<string, MonthTotals>();
  for (const t of txns) {
    if (t.status !== "booked") continue;
    if (t.kind === "transfer" && (!t.counterpartAccountId || internalAccountIds.has(t.counterpartAccountId))) continue;
    const key = monthKey(t.bookedOn);
    const row = map.get(key) ?? { month: key, incomeCents: 0, expenseCents: 0 };
    if (t.amountCents >= 0) row.incomeCents += t.amountCents;
    else row.expenseCents -= t.amountCents;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** Groups statement rows by month, newest month first, rows newest first. */
export function groupByMonthDesc<T extends Pick<Transaction, "bookedOn" | "id">>(rows: T[]): { month: string; rows: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const r of sortChronological(rows).reverse()) {
    const key = monthKey(r.bookedOn);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups.entries()].map(([month, rows]) => ({ month, rows }));
}
