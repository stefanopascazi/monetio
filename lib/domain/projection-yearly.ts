// Calendar-year buckets of a monthly projection detail, for long horizons.
import type { AccountMonthDetail, DetailItem, ProjectionDetailMonth } from "./projection-details";

const itemKey = (x: DetailItem) => `${x.source}|${x.label}|${Math.sign(x.amountCents)}|${x.overdue}|${x.counterpartId ?? ""}`;

/**
 * One entry per year (`month` holds `YYYY`): opening of its first month, closing of its last,
 * same lines summed. `months` tells how many months each year covers.
 */
export function yearlyDetails(details: ProjectionDetailMonth[]): (ProjectionDetailMonth & { months: number })[] {
  const years = new Map<string, ProjectionDetailMonth[]>();
  for (const d of details) {
    const y = d.month.slice(0, 4);
    years.set(y, [...(years.get(y) ?? []), d]);
  }
  return [...years].map(([year, months]) => {
    const ids = Object.keys(months[0].byAccount);
    const byAccount: Record<string, AccountMonthDetail> = {};
    for (const id of ids) {
      const lines = new Map<string, DetailItem>();
      for (const m of months) {
        for (const it of m.byAccount[id]?.items ?? []) {
          const k = itemKey(it);
          const cur = lines.get(k);
          lines.set(k, cur ? { ...cur, amountCents: cur.amountCents + it.amountCents, count: cur.count + it.count } : { ...it });
        }
      }
      byAccount[id] = {
        openingCents: months[0].byAccount[id].openingCents,
        closingCents: months.at(-1)!.byAccount[id].closingCents,
        items: [...lines.values()].filter((x) => x.amountCents),
      };
    }
    return { month: year, months: months.length, byAccount };
  });
}
