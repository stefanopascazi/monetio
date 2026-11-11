// Pure aggregations behind Analisi > Statistiche: booked data only, never forecasts.
import type { Category } from "../domain/types";
import { findNoise, merchantKey, merchantLabel } from "../import/merchant";
import type { MonthlyFlow } from "./flows";

/** Booked expense row of the period (amount negative, refunds positive). */
export interface ExpenseRow {
  accountId: string;
  description: string;
  amountCents: number;
  bookedOn: string;
  categoryId: string | null;
  /** Booked from a recurring rule or a quota: a fixed commitment. */
  fromRule: boolean;
}

export interface PeriodTotals {
  incomeCents: number;
  /** Positive. */
  expenseCents: number;
  /** Income minus expenses: negative when the period cost more than it earned. */
  savedCents: number;
  avgMonthlyExpenseCents: number;
}

/** Income and expenses of the months (giroconti and adjustments excluded). */
export function periodTotals(flows: MonthlyFlow[], months: string[]): PeriodTotals {
  const inPeriod = new Set(months);
  let income = 0;
  let expense = 0;
  for (const f of flows) {
    if (!inPeriod.has(f.month)) continue;
    if (f.kind === "income") income += f.totalCents;
    else if (f.kind === "expense") expense -= f.totalCents;
  }
  return { incomeCents: income, expenseCents: expense, savedCents: income - expense, avgMonthlyExpenseCents: months.length ? Math.round(expense / months.length) : 0 };
}

export interface CategoryComparison {
  categoryId: string | null;
  name: string;
  currentCents: number;
  averageCents: number;
  /** Change against the average in percent; null without an average to compare with. */
  deltaPct: number | null;
}

/** Spending per category in `month` against its average over `baseMonths`, biggest spending first. */
export function categoryComparison(flows: MonthlyFlow[], month: string, baseMonths: string[], categories: Pick<Category, "id" | "name">[]): CategoryComparison[] {
  const base = new Set(baseMonths);
  const current = new Map<string | null, number>();
  const past = new Map<string | null, number>();
  for (const f of flows) {
    if (f.kind !== "expense") continue;
    const target = f.month === month ? current : base.has(f.month) ? past : null;
    target?.set(f.categoryId, (target.get(f.categoryId) ?? 0) - f.totalCents);
  }
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const ids = new Set([...current.keys(), ...past.keys()]);
  return [...ids]
    .map((id) => {
      const currentCents = Math.max(0, current.get(id) ?? 0);
      const averageCents = baseMonths.length ? Math.max(0, Math.round((past.get(id) ?? 0) / baseMonths.length)) : 0;
      return {
        categoryId: id,
        name: (id && names.get(id)) || "Senza categoria",
        currentCents,
        averageCents,
        deltaPct: averageCents > 0 ? Math.round(((currentCents - averageCents) / averageCents) * 100) : null,
      };
    })
    .filter((c) => c.currentCents > 0 || c.averageCents > 0)
    .sort((a, b) => b.currentCents - a.currentCents || b.averageCents - a.averageCents);
}

export interface MerchantTotal {
  label: string;
  /** Positive. */
  totalCents: number;
  count: number;
}

/** Who gets the most money: expenses grouped by merchant words, net of refunds. */
export function topMerchants(rows: ExpenseRow[], limit = 8): MerchantTotal[] {
  const noise = findNoise(rows.map((r) => r.description));
  const groups = new Map<string, MerchantTotal & { lastOn: string }>();
  for (const r of rows) {
    const key = merchantKey(r.description, noise) || r.description.trim().toLowerCase();
    const g = groups.get(key) ?? { label: "", totalCents: 0, count: 0, lastOn: "" };
    g.totalCents -= r.amountCents;
    if (r.amountCents < 0) g.count++;
    // The most recent description names the group.
    if (r.bookedOn >= g.lastOn) {
      g.lastOn = r.bookedOn;
      g.label = merchantLabel(r.description, noise);
    }
    groups.set(key, g);
  }
  return [...groups.values()]
    .filter((g) => g.totalCents > 0)
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, limit)
    .map(({ label, totalCents, count }) => ({ label, totalCents, count }));
}

/**
 * Expenses split into fixed commitments and everything else (positive cents). Fixed: booked from a rule or
 * quota, or in the category of an active fixed expense rule (imported movements carry no rule link).
 */
export function fixedAndVariable(rows: ExpenseRow[], fixedCategoryIds: ReadonlySet<string> = new Set()): { fixedCents: number; variableCents: number } {
  let fixed = 0;
  let variable = 0;
  for (const r of rows) {
    if (r.fromRule || (r.categoryId !== null && fixedCategoryIds.has(r.categoryId))) fixed -= r.amountCents;
    else variable -= r.amountCents;
  }
  return { fixedCents: Math.max(0, fixed), variableCents: Math.max(0, variable) };
}
