// View helpers for the month-by-month projection detail.
import type { AccountMonthDetail, DetailItem, ProjectionDetailMonth } from "../domain/projection-details";

export interface DetailMonthView extends AccountMonthDetail {
  month: string;
  /** Still expected. */
  income: DetailItem[];
  expense: DetailItem[];
  /** Already booked (current month only). */
  bookedIncome: DetailItem[];
  bookedExpense: DetailItem[];
  netCents: number;
}

const byAmount = (a: DetailItem, b: DetailItem) => Math.abs(b.amountCents) - Math.abs(a.amountCents);

/**
 * Detail of one account, or of several merged together: transfers between the merged
 * accounts cancel out (same line with opposite signs).
 */
export function detailMonthViews(details: ProjectionDetailMonth[], accountIds: string[]): DetailMonthView[] {
  return details.map((d) => {
    const parts = accountIds.map((id) => d.byAccount[id]).filter(Boolean);
    const lines = new Map<string, DetailItem>();
    for (const p of parts) {
      for (const it of p.items) {
        const key = `${it.source}|${it.label}|${it.overdue}`;
        const cur = lines.get(key);
        if (cur) lines.set(key, { ...cur, amountCents: cur.amountCents + it.amountCents, count: Math.max(cur.count, it.count) });
        else lines.set(key, { ...it });
      }
    }
    const items = [...lines.values()].filter((x) => x.amountCents);
    const expected = items.filter((x) => x.source !== "booked");
    const booked = items.filter((x) => x.source === "booked");
    const openingCents = parts.reduce((s, p) => s + p.openingCents, 0);
    const closingCents = parts.reduce((s, p) => s + p.closingCents, 0);
    return {
      month: d.month,
      openingCents,
      closingCents,
      netCents: closingCents - openingCents,
      items,
      income: expected.filter((x) => x.amountCents > 0).sort(byAmount),
      expense: expected.filter((x) => x.amountCents < 0).sort(byAmount),
      bookedIncome: booked.filter((x) => x.amountCents > 0).sort(byAmount),
      bookedExpense: booked.filter((x) => x.amountCents < 0).sort(byAmount),
    };
  });
}
