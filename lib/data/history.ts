import type { ProjectionPoint } from "@monetio/ui";
import { addMonthsToKey, monthLabel } from "../domain/dates";
import type { ProjectionMonth } from "../domain/projection";
import type { MonthlyBalance } from "./queries";

/**
 * Month-end total balance over `months` (oldest first) for the given accounts,
 * carrying the last known balance forward through months without movements.
 */
export function balanceHistory(rows: MonthlyBalance[], accountIds: string[], months: string[], openingBefore: Record<string, number>): number[] {
  const byAccount = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (!byAccount.has(r.accountId)) byAccount.set(r.accountId, new Map());
    byAccount.get(r.accountId)!.set(r.month, r.balanceCents);
  }
  const last: Record<string, number> = { ...openingBefore };
  return months.map((m) => {
    let total = 0;
    for (const id of accountIds) {
      const v = byAccount.get(id)?.get(m);
      if (v !== undefined) last[id] = v;
      total += last[id] ?? 0;
    }
    return total;
  });
}

/** Last `n` month keys ending with `current` (inclusive), oldest first. */
export function lastMonths(current: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addMonthsToKey(current, i - n + 1));
}

/** Chart points: history (excluding the current month) followed by projected month-ends. */
export function projectionPoints(history: { month: string; valueCents: number }[], projection: ProjectionMonth[], pick: (p: ProjectionMonth) => number): ProjectionPoint[] {
  // Over 12 points the same month name repeats: add the year so labels stay distinct.
  const withYear = history.length + projection.length > 12;
  const label = (m: string) => (withYear ? monthLabel(m) : monthLabel(m).split(" ")[0]);
  return [
    ...history.map((h) => ({ label: label(h.month), valueCents: h.valueCents })),
    ...projection.map((p) => ({ label: label(p.month), valueCents: pick(p), projected: true })),
  ];
}

/**
 * Balance of each account before `firstMonth`: the last month-end before it, else the opening
 * balance when the account was already open.
 */
export function openingBalancesBefore(
  rows: MonthlyBalance[],
  accounts: { id: string; openingDate: string; openingBalanceCents: number }[],
  firstMonth: string,
): Record<string, number> {
  const out: Record<string, number> = {};
  // Rows are ordered by month, so the last one before `firstMonth` wins.
  for (const r of rows) if (r.month < firstMonth) out[r.accountId] = r.balanceCents;
  for (const a of accounts) if (out[a.id] === undefined && a.openingDate < `${firstMonth}-01`) out[a.id] = a.openingBalanceCents;
  return out;
}

/** Month-end balances of one account within a year, for the statement chart. */
export function yearBalancePoints(rows: MonthlyBalance[], accountId: string, year: number): { label: string; valueCents: number }[] {
  return rows
    .filter((m) => m.accountId === accountId && m.month >= `${year}-01` && m.month <= `${year}-12`)
    .map((m) => ({ label: monthLabel(m.month).split(" ")[0], valueCents: m.balanceCents }));
}
