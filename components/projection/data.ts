import "server-only";
import { cache } from "react";
import { loadProjection } from "@/lib/data/agenda";
import { balanceHistory, lastMonths, openingBalancesBefore, projectionPoints } from "@/lib/data/history";
import { listMonthlyBalances } from "@/lib/data/queries";
import { loadReliability } from "@/lib/data/reliability";
import { combinedUncertainty } from "@/lib/domain/reliability";
import { addMonthsToKey, monthKey, startOfMonth } from "@/lib/domain/dates";
import type { ProjectionSeries } from "./ProjectionPanel";

/** Months of month-end history before the projection. */
export const HISTORY_MONTHS = 6;

/** Chart series (all accounts, then each one): past month-ends followed by the projection. */
export const loadProjectionSeries = cache(async (months: number): Promise<ProjectionSeries[]> => {
  const [{ today, accounts, projection }, { bands }] = await Promise.all([loadProjection(months), loadReliability()]);
  const history = lastMonths(addMonthsToKey(monthKey(today), -1), HISTORY_MONTHS);
  // Two years back finds the last month-end of accounts without recent movements.
  const balances = await listMonthlyBalances(startOfMonth(addMonthsToKey(history[0], -24)));
  const openingBefore = openingBalancesBefore(balances, accounts, history[0]);

  const series = (ids: string[], id: string, name: string): ProjectionSeries => {
    const hist = balanceHistory(balances, ids, history, openingBefore);
    return {
      id,
      name,
      points: projectionPoints(
        history.map((m, i) => ({ month: m, valueCents: hist[i] })),
        projection,
        (p) => ids.reduce((s, x) => s + (p.byAccount[x] ?? 0), 0),
        (n) => combinedUncertainty(bands, ids, n),
      ),
    };
  };
  return [
    series(
      accounts.map((a) => a.id),
      "all",
      "tutti i conti",
    ),
    ...accounts.map((a) => series([a.id], a.id, a.name)),
  ];
});
