// Booked movements of the current month folded into its projection detail, grouped by category.
import { monthKey } from "./dates";
import type { DetailItem, ProjectionDetailMonth } from "./projection-details";
import type { ISODate, TransactionKind } from "./types";

export interface BookedRow {
  accountId: string;
  counterpartAccountId: string | null;
  categoryId: string | null;
  kind: TransactionKind;
  amountCents: number;
  bookedOn: ISODate;
}

export const TRANSFERS_LABEL = "Giroconti";
export const UNCATEGORIZED_LABEL = "Senza categoria";

const byImpact = (a: DetailItem, b: DetailItem) => Math.abs(b.amountCents) - Math.abs(a.amountCents);

function transferLabel(r: BookedRow, accountNames: Record<string, string>): string {
  const other = r.counterpartAccountId ? accountNames[r.counterpartAccountId] : undefined;
  if (!other) return TRANSFERS_LABEL;
  return r.amountCents < 0 ? `Giroconto verso ${other}` : `Giroconto da ${other}`;
}

/** One line per category and sign (income and expense never net out); transfers one line per counterpart. */
export function bookedItems(rows: BookedRow[], categoryNames: Record<string, string>, accountNames: Record<string, string> = {}): DetailItem[] {
  const lines = new Map<string, DetailItem>();
  for (const r of rows) {
    if (!r.amountCents) continue;
    const transfer = r.kind === "transfer";
    const label = transfer ? transferLabel(r, accountNames) : (r.categoryId && categoryNames[r.categoryId]) || UNCATEGORIZED_LABEL;
    const counterpart = transfer ? (r.counterpartAccountId ?? undefined) : undefined;
    const key = `${label}|${Math.sign(r.amountCents)}|${counterpart ?? ""}`;
    const item: DetailItem = lines.get(key) ?? { label, source: "booked", amountCents: 0, count: 0, overdue: false, ...(counterpart ? { counterpartId: counterpart } : {}) };
    item.amountCents += r.amountCents;
    item.count++;
    lines.set(key, item);
  }
  return [...lines.values()].sort(byImpact);
}

/**
 * Adds the booked rows of `month` to that month's detail: they become "booked" lines and
 * the opening moves back to the balance at the start of the month. Other months are untouched.
 */
export function withBookedMonth(
  details: ProjectionDetailMonth[],
  month: string,
  rows: BookedRow[],
  categoryNames: Record<string, string>,
  accountNames: Record<string, string> = {},
): ProjectionDetailMonth[] {
  return details.map((d) => {
    if (d.month !== month) return d;
    const byAccount = Object.fromEntries(
      Object.entries(d.byAccount).map(([id, acc]) => {
        const own = rows.filter((r) => r.accountId === id && monthKey(r.bookedOn) === month);
        const bookedCents = own.reduce((s, r) => s + r.amountCents, 0);
        return [id, { ...acc, openingCents: acc.openingCents - bookedCents, items: [...bookedItems(own, categoryNames, accountNames), ...acc.items] }];
      }),
    );
    return { ...d, byAccount };
  });
}
