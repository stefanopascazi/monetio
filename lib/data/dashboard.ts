// Pure dashboard figures derived from monthly flows.
import { addMonthsToKey } from "../domain/dates";
import type { Category } from "../domain/types";
import type { CashflowPoint } from "@monetio/ui";
import { categorySlices, type MonthlyFlow } from "./flows";

/** Percentage change from `b` to `a`; undefined when there is no base. */
export const percentChange = (a: number, b: number) => (b ? ((a - b) / b) * 100 : undefined);

/** Current vs previous month from a cashflow series (last two points). */
export function monthOverMonth(cashflow: CashflowPoint[]) {
  const now = cashflow.at(-1) ?? { incomeCents: 0, expenseCents: 0 };
  const prev = cashflow.at(-2) ?? { incomeCents: 0, expenseCents: 0 };
  return {
    incomeCents: now.incomeCents,
    expenseCents: now.expenseCents,
    incomeDelta: percentChange(now.incomeCents, prev.incomeCents),
    expenseDelta: percentChange(now.expenseCents, prev.expenseCents),
  };
}

/** Month shown in the category donut: the current one, or the previous while it has no spending yet. */
export function donutMonth(flows: MonthlyFlow[], month: string, categories: Category[]): string {
  return categorySlices(flows, month, categories).length ? month : addMonthsToKey(month, -1);
}
