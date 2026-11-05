import "server-only";
import { cache } from "react";
import { addDays, addMonthsToKey, monthKey, startOfMonth, todayISO } from "../domain/dates";
import { projectBalances } from "../domain/projection";
import { bookedOccurrences, dueEntries, upcomingOccurrences } from "../domain/schedule";
import { getContext } from "./context";
import { categorySpentFrom, contributionSpendingFrom } from "./flows";
import { listAccounts, listBookedOccurrences, listContributions, listFlows, listRules, listTransactions } from "./queries";
import { syncAutoRules } from "./sync";

const LOOKBACK_DAYS = 90;

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
  const [rules, contributions, occ, flows] = await Promise.all([
    listRules(),
    listContributions(),
    listBookedOccurrences(since),
    listFlows(startOfMonth(monthKey(since))),
  ]);
  const booked = bookedOccurrences(occ, rules);
  return {
    today,
    rules,
    contributions,
    booked,
    flows,
    due: dueEntries(rules, contributions, booked, today, contributionSpendingFrom(flows), { lookbackDays: LOOKBACK_DAYS, horizonDays: 31 }),
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
  const [accounts, planned, monthFlows] = await Promise.all([
    listAccounts(),
    listTransactions({ status: "planned", limit: 1000 }),
    listFlows(startOfMonth(addMonthsToKey(monthKey(agenda.today), -1))),
  ]);
  const active = accounts.filter((a) => !a.archived);
  const ids = new Set(active.map((a) => a.id));
  const projection = projectBalances({
    today: agenda.today,
    months,
    balances: Object.fromEntries(active.map((a) => [a.id, a.balanceCents])),
    rules: agenda.rules.filter((r) => ids.has(r.accountId)),
    contributions: agenda.contributions.filter((c) => ids.has(c.fromAccountId) || ids.has(c.toAccountId)),
    booked: agenda.booked,
    contributionSpending: contributionSpendingFrom(monthFlows),
    categorySpent: categorySpentFrom(monthFlows),
    planned: planned.filter((t) => ids.has(t.accountId)),
    lookbackDays: LOOKBACK_DAYS,
  });
  // Movements towards accounts the viewer cannot see (e.g. a private one) are dropped.
  for (const p of projection) {
    for (const id of Object.keys(p.byAccount)) if (!ids.has(id)) delete p.byAccount[id];
    p.totalCents = Object.values(p.byAccount).reduce((s, v) => s + v, 0);
  }
  return { today: agenda.today, accounts: active, projection };
});
