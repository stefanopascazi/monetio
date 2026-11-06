// Average month per account over the coming year, built only from recurring rules and quotas.
import { addMonthsToKey, endOfMonth, monthKey, startOfMonth } from "./dates";
import { occurrences } from "./recurrence";
import type { ContributionRule, RecurringRule } from "./types";

/** Months averaged by the summary, starting from the next full month. */
export const SUMMARY_MONTHS = 12;

export interface AccountMonthlySummary {
  rulesIncomeCents: number;
  /** Positive. */
  rulesExpenseCents: number;
  /** Signed net of transfer rules and quotas (estimate-based). */
  transfersCents: number;
  netCents: number;
}

/** First and last day of the averaged window: the SUMMARY_MONTHS after the current month. */
export function summaryWindow(today: string): { from: string; to: string } {
  const next = addMonthsToKey(monthKey(today), 1);
  return { from: startOfMonth(next), to: endOfMonth(addMonthsToKey(next, SUMMARY_MONTHS - 1)) };
}

/**
 * Average month per account over the next SUMMARY_MONTHS: every rule and quota counts only
 * for the occurrences inside its start/end dates (e.g. a salary raise replaces the old amount
 * from its start month, a budget starting in January weighs from January).
 */
export function monthlySummary(accountIds: string[], rules: RecurringRule[], contributions: ContributionRule[], today: string): Record<string, AccountMonthlySummary> {
  const { from, to } = summaryWindow(today);
  const out: Record<string, AccountMonthlySummary> = {};
  const slot = (id: string) => (out[id] ??= { rulesIncomeCents: 0, rulesExpenseCents: 0, transfersCents: 0, netCents: 0 });
  const avg = (amount: number, count: number) => Math.round((amount * count) / SUMMARY_MONTHS);
  for (const id of accountIds) slot(id);
  for (const r of rules) {
    if (!r.active) continue;
    const m = avg(r.amountCents, occurrences(r, from, to).length);
    if (!m) continue;
    if (r.kind === "transfer") {
      slot(r.accountId).transfersCents += m;
      if (r.counterpartAccountId) slot(r.counterpartAccountId).transfersCents -= m;
    } else if (m > 0) slot(r.accountId).rulesIncomeCents += m;
    else slot(r.accountId).rulesExpenseCents -= m;
  }
  for (const c of contributions) {
    if (!c.active) continue;
    const count = occurrences({ frequency: "monthly", dayOfMonth: c.dayOfMonth, startDate: c.startDate, endDate: c.endDate }, from, to).length;
    const m = avg(c.fixedCents + Math.round((c.estimatedSpendingCents * c.sharePercent) / 100), count);
    slot(c.fromAccountId).transfersCents -= m;
    slot(c.toAccountId).transfersCents += m;
  }
  for (const s of Object.values(out)) s.netCents = s.rulesIncomeCents - s.rulesExpenseCents + s.transfersCents;
  return out;
}
