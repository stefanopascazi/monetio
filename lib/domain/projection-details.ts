// Month-by-month breakdown of a projection: which movements make each month-end balance.
import { addMonthsToKey, endOfMonth, monthKey } from "./dates";
import { type MovementSource, type ProjectionInput, projectedMovements } from "./projection";

export interface DetailItem {
  label: string;
  /** "booked" for movements already in the balance (current month only). */
  source: MovementSource | "booked";
  /** Signed sum for the month (positive = money in). */
  amountCents: number;
  /** Occurrences merged into this line (e.g. a weekly rule). */
  count: number;
  /** Past due and unpaid, carried into the current month. */
  overdue: boolean;
}

export interface AccountMonthDetail {
  openingCents: number;
  closingCents: number;
  /** Money in first (largest first), then money out (largest first). */
  items: DetailItem[];
}

export interface ProjectionDetailMonth {
  month: string;
  byAccount: Record<string, AccountMonthDetail>;
}

const byImpact = (a: DetailItem, b: DetailItem) => Number(b.amountCents > 0) - Number(a.amountCents > 0) || Math.abs(b.amountCents) - Math.abs(a.amountCents);

/** Opening/closing balance and merged movements per month for the given accounts. */
export function projectionDetails(input: ProjectionInput, accountIds: string[], maxMonths = input.months): ProjectionDetailMonth[] {
  const wanted = new Set(accountIds);
  const movements = projectedMovements(input)
    .filter((m) => wanted.has(m.accountId))
    .sort((a, b) => a.date.localeCompare(b.date));
  const running: Record<string, number> = Object.fromEntries(accountIds.map((id) => [id, input.balances[id] ?? 0]));
  const out: ProjectionDetailMonth[] = [];
  let i = 0;
  for (let n = 0; n < Math.min(input.months, maxMonths); n++) {
    const month = addMonthsToKey(monthKey(input.today), n);
    const last = endOfMonth(month);
    const lines = new Map<string, Map<string, DetailItem>>(accountIds.map((id) => [id, new Map()]));
    const opening = { ...running };
    for (; i < movements.length && movements[i].date <= last; i++) {
      const m = movements[i];
      running[m.accountId] += m.amountCents;
      const overdue = m.overdue ?? false;
      const key = `${m.source}|${m.label}|${Math.sign(m.amountCents)}|${overdue}`;
      const acc = lines.get(m.accountId)!;
      const item = acc.get(key) ?? { label: m.label, source: m.source, amountCents: 0, count: 0, overdue };
      item.amountCents += m.amountCents;
      item.count++;
      acc.set(key, item);
    }
    const byAccount: Record<string, AccountMonthDetail> = {};
    for (const id of accountIds) {
      byAccount[id] = { openingCents: opening[id], closingCents: running[id], items: [...lines.get(id)!.values()].filter((x) => x.amountCents).sort(byImpact) };
    }
    out.push({ month, byAccount });
  }
  return out;
}
