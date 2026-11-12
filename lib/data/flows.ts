// Pure helpers over the `monthly_flows` aggregate.
import type { CashflowPoint, CategorySlice } from "@monetio/ui";
import { monthLabel } from "../domain/dates";
import type { Category } from "../domain/types";
import type { MonthlyFlow } from "./flow-math";

export { contributionSpendingFrom, estimateUsedFrom, mapFlow, type MonthlyFlow, spentIn } from "./flow-math";

/**
 * Household cash flow per month: income and expenses on the visible accounts,
 * ignoring transfers and adjustments.
 */
export function cashflowSeries(flows: MonthlyFlow[], months: string[]): CashflowPoint[] {
  return months.map((m) => {
    let income = 0;
    let expense = 0;
    for (const f of flows) {
      if (f.month !== m || (f.kind !== "income" && f.kind !== "expense")) continue;
      if (f.totalCents >= 0) income += f.totalCents;
      else expense -= f.totalCents;
    }
    return { label: monthLabel(m).split(" ")[0], incomeCents: income, expenseCents: expense };
  });
}

/** Expenses by category for a month (positive cents), largest first. */
export function categorySlices(flows: MonthlyFlow[], month: string, categories: Category[]): CategorySlice[] {
  const byId = new Map<string, number>();
  for (const f of flows) {
    if (f.month !== month || f.kind !== "expense") continue;
    const key = f.categoryId ?? "none";
    byId.set(key, (byId.get(key) ?? 0) - f.totalCents);
  }
  const names = new Map(categories.map((c) => [c.id, c.name]));
  return [...byId.entries()]
    .filter(([, v]) => v > 0)
    .map(([id, v]) => ({ label: names.get(id) ?? "Senza categoria", valueCents: v }))
    .sort((a, b) => b.valueCents - a.valueCents);
}
