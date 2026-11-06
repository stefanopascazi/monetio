import "server-only";
import { cache } from "react";
import { addDays, addMonthsToKey, endOfMonth, monthKey, startOfMonth, todayISO } from "../domain/dates";
import { monthlySummary } from "../domain/monthly-summary";
import { type ProjectionInput, projectBalances } from "../domain/projection";
import { projectionDetails } from "../domain/projection-details";
import { bookedOccurrences, dueEntries, overrideMap, upcomingOccurrences } from "../domain/schedule";
import { getContext } from "./context";
import { categorySpentFrom, contributionSpendingFrom } from "./flows";
import { pendingTransfersByAccount } from "./pending-transfers";
import { listAccounts, listBookedOccurrences, listContributions, listFlows, listOverrides, listRules, listTransactions } from "./queries";
import { touchesVisible } from "./rule-visibility";
import { syncAutoRules } from "./sync";

const LOOKBACK_DAYS = 90;
/** Months with a movement-by-movement breakdown (longer horizons show balances only). */
export const DETAIL_MONTHS = 36;

/** Books passed automatic rules once per request, before any page reads balances. */
export const ensureSynced = cache(async () => {
  const ctx = await getContext();
  await syncAutoRules(ctx, todayISO());
  return ctx;
});

/** Deadlines to pay and upcoming automatic movements. */
export const loadAgenda = cache(async () => {
  await ensureSynced();
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

/** Month-end balance projection for the visible, non-archived accounts. */
export const loadProjection = cache(async (months: number) => {
  const agenda = await loadAgenda();
  const current = monthKey(agenda.today);
  const [accounts, planned, monthFlows] = await Promise.all([
    listAccounts(),
    listTransactions({ status: "planned", limit: 1000 }),
    // Current and previous month: spending so far for estimates and quotas.
    listFlows(startOfMonth(addMonthsToKey(current, -1))),
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
    categorySpent: categorySpentFrom(monthFlows),
    planned: planned.filter((t) => ids.has(t.accountId)),
    lookbackDays: LOOKBACK_DAYS,
    overrides: agenda.overrides,
  };
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

/** Pending transfers per account up to the end of the current month. */
export const loadPendingTransfers = cache(async () => {
  const agenda = await loadAgenda();
  return pendingTransfersByAccount(agenda.due, endOfMonth(monthKey(agenda.today)));
});
