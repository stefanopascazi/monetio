import "server-only";
import { cache } from "react";
import { addDays, endOfMonth, monthKey, startOfMonth, todayISO } from "../domain/dates";
import type { BookedRow } from "../domain/booked-month";
import { accountMonthRecap } from "../domain/month-recap";
import { monthlySummary } from "../domain/monthly-summary";
import { projectBalances, projectedMovements } from "../domain/projection";
import { projectionDetails } from "../domain/projection-details";
import { getContext } from "./context";
import { buildAgenda, buildProjectionInput, decrementCategories, LOOKBACK_DAYS, projectionFlowsSince } from "./projection-input";
import { listAccounts, listBookedOccurrences, listBookedRows, listCategories, listContributions, listEstimateMovements, listFlows, listOverrides, listRules, listTransactions } from "./queries";
import { RECAP_MONTHS } from "./recap-month";

/** Months with a movement-by-movement breakdown (longer horizons show balances only). */
export const DETAIL_MONTHS = 36;

/**
 * Deadlines to pay and upcoming automatic movements.
 * Automatic rules are booked by the daily cron and by rule saves, never on page load.
 */
export const loadAgenda = cache(async () => {
  // Session first: marks the render as dynamic before reading today's date.
  await getContext();
  const today = todayISO();
  const since = addDays(today, -LOOKBACK_DAYS);
  const [rules, contributions, occurrences, flows, overrides] = await Promise.all([
    listRules(),
    listContributions(),
    listBookedOccurrences(since),
    listFlows(startOfMonth(monthKey(since))),
    listOverrides(),
  ]);
  return buildAgenda({ today, rules, contributions, occurrences, flows, overrides });
});

/** Projection input for the visible, non-archived accounts over `months` month ends. */
const loadProjectionInput = cache(async (months: number) => {
  const agenda = await loadAgenda();
  const current = monthKey(agenda.today);
  const [accounts, planned, monthFlows, estimateMovements] = await Promise.all([
    listAccounts(),
    listTransactions({ status: "planned", limit: 1000 }),
    listFlows(startOfMonth(projectionFlowsSince(agenda.today))),
    listEstimateMovements(startOfMonth(current), endOfMonth(current), decrementCategories(agenda.rules)),
  ]);
  return { agenda, ...buildProjectionInput(agenda, { accounts, planned, monthFlows, estimateMovements }, months) };
});

/** Month-end balance projection for the visible, non-archived accounts. */
export const loadProjection = cache(async (months: number) => {
  const { agenda, active, ids, rules, contributions, input } = await loadProjectionInput(months);
  const projection = projectBalances(input);
  const details = projectionDetails(input, [...ids], DETAIL_MONTHS);
  // Movements towards accounts the viewer cannot see (e.g. a private one) are dropped.
  for (const p of projection) {
    for (const id of Object.keys(p.byAccount)) if (!ids.has(id)) delete p.byAccount[id];
    p.totalCents = Object.values(p.byAccount).reduce((s, v) => s + v, 0);
  }
  const summary = monthlySummary(
    active.map((a) => a.id),
    rules,
    contributions,
    agenda.today,
  );
  return { today: agenda.today, accounts: active, projection, details, summary };
});

/** Movement detail over the whole horizon, for the yearly grid of horizons beyond DETAIL_MONTHS. */
export const loadFullDetails = cache(async (months: number) => {
  const { ids, input } = await loadProjectionInput(months);
  return projectionDetails(input, [...ids]);
});

/** Booked rows of the current month and category names, for the projection detail. */
export const loadCurrentMonthBooked = cache(async (): Promise<{ month: string; rows: BookedRow[]; categoryNames: Record<string, string> }> => {
  const { today } = await loadAgenda();
  const month = monthKey(today);
  const [rows, categories] = await Promise.all([listBookedRows(startOfMonth(month), endOfMonth(month)), listCategories()]);
  return { month, rows, categoryNames: Object.fromEntries(categories.map((c) => [c.id, c.name])) };
});

/** Booked and still expected movements of an account in a month (current by default), with its balances. */
export const loadAccountMonthRecap = cache(async (accountId: string, balanceCents: number, month?: string) => {
  const { input } = await loadProjectionInput(RECAP_MONTHS);
  const m = month ?? monthKey(input.today);
  const booked = await listTransactions({ accountId, status: "booked", from: startOfMonth(m), to: endOfMonth(m), limit: 1000 });
  return accountMonthRecap(projectedMovements(input), booked, accountId, balanceCents, input.today, m);
});

/** Expected month-end balance ("rimanenza") per visible account. */
export const loadMonthEndBalances = cache(async () => {
  const { input } = await loadProjectionInput(1);
  return projectBalances(input)[0]?.byAccount ?? {};
});
