import "server-only";
import { cache } from "react";
import { getContext } from "@/lib/data/context";
import { cashflowSeries } from "@/lib/data/flows";
import { lastMonths } from "@/lib/data/history";
import { listAccounts, listCategories, listFlows } from "@/lib/data/queries";
import { monthKey, startOfMonth, todayISO } from "@/lib/domain/dates";

/** Months of history shown by the dashboard charts and stats. */
export const DASHBOARD_MONTHS = 6;

/**
 * Flows of the last months, shared by the sections that stream independently
 * (React cache: one read per request).
 */
export const loadDashboardFlows = cache(async () => {
  // Session first: marks the render as dynamic before reading today's date.
  await getContext();
  const today = todayISO();
  const month = monthKey(today);
  const months = lastMonths(month, DASHBOARD_MONTHS);
  const [flows, categories] = await Promise.all([listFlows(startOfMonth(months[0])), listCategories()]);
  return { today, month, flows, categories, cashflow: cashflowSeries(flows, months) };
});

/** Non-archived accounts with the id/name refs used by forms and lists. */
export const loadActiveAccounts = cache(async () => {
  const accounts = await listAccounts();
  const active = accounts.filter((a) => !a.archived);
  return { accounts, active, refs: active.map((a) => ({ id: a.id, name: a.name })) };
});
