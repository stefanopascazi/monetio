import "server-only";
import { cache } from "react";
import { addDays, addMonthsToKey, endOfMonth, monthKey, startOfMonth, todayISO } from "../domain/dates";
import type { BookedRow } from "../domain/booked-month";
import { isDecreasing } from "../domain/estimates";
import { accountMonthRecap } from "../domain/month-recap";
import { monthlySummary } from "../domain/monthly-summary";
import { type ProjectionInput, projectBalances, projectedMovements } from "../domain/projection";
import { projectionDetails } from "../domain/projection-details";
import { bookedOccurrences, dueEntries, overrideMap, upcomingOccurrences } from "../domain/schedule";
import { getContext } from "./context";
import { contributionSpendingFrom, estimateUsedFrom } from "./flows";
import { listAccounts, listBookedOccurrences, listBookedRows, listCategories, listContributions, listEstimateMovements, listFlows, listOverrides, listRules, listTransactions } from "./queries";
import { RECAP_MONTHS } from "./recap-month";
import { touchesVisible } from "./rule-visibility";

const LOOKBACK_DAYS = 90;
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
  const [rules, contributions, occ, flows, overrideList] = await Promise.all([
    listRules(),
    listContributions(),
    listBookedOccurrences(since),
    listFlows(startOfMonth(monthKey(since))),
    listOverrides(),
  ]);
  const booked = bookedOccurrences(occ, rules);
  const overrides = overrideMap(overrideList);
  return {
    today,
    rules,
    contributions,
    booked,
    flows,
    overrides,
    due: dueEntries(rules, contributions, booked, today, contributionSpendingFrom(flows), { lookbackDays: LOOKBACK_DAYS, horizonDays: 31, overrides }),
    upcoming: upcomingOccurrences(
      rules.filter((r) => r.schedule === "auto"),
      booked,
      today,
      31,
    ),
  };
});

/** Projection input for the visible, non-archived accounts over `months` month ends. */
const loadProjectionInput = cache(async (months: number) => {
  const agenda = await loadAgenda();
  const current = monthKey(agenda.today);
  // Categories of decreasing estimates: their booked movements this month reduce them.
  const decrementCategories = [...new Set(agenda.rules.filter(isDecreasing).flatMap((r) => r.decrementCategoryIds))];
  const [accounts, planned, monthFlows, estimateMovements] = await Promise.all([
    listAccounts(),
    listTransactions({ status: "planned", limit: 1000 }),
    // Current and previous month: spending so far for estimates and quotas.
    listFlows(startOfMonth(addMonthsToKey(current, -1))),
    listEstimateMovements(startOfMonth(current), endOfMonth(current), decrementCategories),
  ]);
  const active = accounts.filter((a) => !a.archived);
  const ids = new Set(active.map((a) => a.id));
  // Includes transfers from accounts the viewer cannot see (e.g. a private quota into the joint account).
  const rules = agenda.rules.filter((r) => touchesVisible(r, ids));
  const contributions = agenda.contributions.filter((c) => ids.has(c.fromAccountId) || ids.has(c.toAccountId));
  const input: ProjectionInput = {
    today: agenda.today,
    months,
    balances: Object.fromEntries(active.map((a) => [a.id, a.balanceCents])),
    rules,
    contributions,
    booked: agenda.booked,
    contributionSpending: contributionSpendingFrom(monthFlows),
    estimateUsed: estimateUsedFrom(monthFlows),
    planned: planned.filter((t) => ids.has(t.accountId)),
    lookbackDays: LOOKBACK_DAYS,
    overrides: agenda.overrides,
    cardAccountIds: new Set(active.filter((a) => a.type === "card").map((a) => a.id)),
    estimateMovements,
  };
  return { agenda, active, ids, rules, contributions, input };
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
