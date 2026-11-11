import "server-only";
import { cache } from "react";
import { getContext } from "@/lib/data/context";
import { cashflowSeries } from "@/lib/data/flows";
import { lastMonths } from "@/lib/data/history";
import { listAccounts, listCategories, listExpenseRows, listFlows, listRules } from "@/lib/data/queries";
import { categoryComparison, fixedAndVariable, periodTotals, topMerchants } from "@/lib/data/statistics";
import { addMonthsToKey, endOfMonth, monthKey, startOfMonth, todayISO } from "@/lib/domain/dates";

/** Visible, non-archived accounts offered by the filter. */
export const loadStatisticsAccounts = cache(async () => (await listAccounts()).filter((a) => !a.archived).map((a) => ({ id: a.id, name: a.name })));

/**
 * Statistics over the last `months` complete months (the running one would skew averages), for one
 * account or all. The category comparison sets the last complete month against the `months` before it.
 */
export const loadStatistics = cache(async (accountId: string | null, months: number) => {
  // Session first: marks the render as dynamic before reading today's date.
  await getContext();
  const last = addMonthsToKey(monthKey(todayISO()), -1);
  const period = lastMonths(last, months);
  const base = lastMonths(addMonthsToKey(last, -1), months);
  const [allFlows, rows, categories, rules] = await Promise.all([
    listFlows(startOfMonth(base[0])),
    listExpenseRows(startOfMonth(period[0]), endOfMonth(last), accountId),
    listCategories(),
    listRules(),
  ]);
  // Categories of fixed commitments; estimates are budgets for variable spending, so they stay out.
  const fixedCategories = new Set(rules.filter((r) => r.active && r.kind === "expense" && r.schedule !== "estimate" && r.categoryId).map((r) => r.categoryId!));
  const flows = accountId ? allFlows.filter((f) => f.accountId === accountId) : allFlows;
  return {
    period,
    month: last,
    totals: periodTotals(flows, period),
    cashflow: cashflowSeries(flows, period),
    categories: categoryComparison(flows, last, base, categories),
    merchants: topMerchants(rows),
    split: fixedAndVariable(rows, fixedCategories),
  };
});
