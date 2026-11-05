// Pure helpers over the `monthly_flows` aggregate.
import type { CashflowPoint, CategorySlice } from "@monetio/ui";
import { monthLabel } from "../domain/dates";
import type { Category, ContributionRule } from "../domain/types";

export interface MonthlyFlow {
  accountId: string;
  /** `YYYY-MM` */
  month: string;
  categoryId: string | null;
  kind: "income" | "expense" | "transfer" | "adjustment";
  counterpartAccountId: string | null;
  totalCents: number;
}

export function mapFlow(r: Record<string, unknown>): MonthlyFlow {
  return {
    accountId: String(r.account_id),
    month: String(r.month).slice(0, 7),
    categoryId: r.category_id == null ? null : String(r.category_id),
    kind: r.kind as MonthlyFlow["kind"],
    counterpartAccountId: r.counterpart_account_id == null ? null : String(r.counterpart_account_id),
    totalCents: Number(r.total_cents),
  };
}

/** Net spending (positive) on an account in some categories during a month. */
export function spentIn(flows: MonthlyFlow[], accountId: string, categoryIds: string[] | null, month: string): number {
  const net = flows
    .filter((f) => f.accountId === accountId && f.month === month && (f.kind === "expense" || f.kind === "income"))
    .filter((f) => categoryIds === null || (f.categoryId !== null && categoryIds.includes(f.categoryId)))
    .reduce((s, f) => s + f.totalCents, 0);
  return Math.max(0, -net);
}

export const contributionSpendingFrom = (flows: MonthlyFlow[]) => (rule: ContributionRule, month: string) =>
  spentIn(flows, rule.spendingAccountId ?? rule.toAccountId, rule.categoryIds, month);

export const categorySpentFrom = (flows: MonthlyFlow[]) => (accountId: string, categoryId: string | null, month: string) =>
  spentIn(flows, accountId, categoryId ? [categoryId] : null, month);

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
