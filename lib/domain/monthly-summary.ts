// Typical month per account, built only from recurring rules and quotas.
import { FREQUENCY_MONTHS } from "./recurrence";
import type { ContributionRule, RecurringRule } from "./types";

/** Average monthly amount of a rule (yearly items count 1/12 per month). */
export function monthlyEquivalent(rule: Pick<RecurringRule, "amountCents" | "frequency">): number {
  if (rule.frequency === "weekly") return Math.round((rule.amountCents * 52) / 12);
  return Math.round(rule.amountCents / FREQUENCY_MONTHS[rule.frequency]);
}

export interface AccountMonthlySummary {
  rulesIncomeCents: number;
  /** Positive. */
  rulesExpenseCents: number;
  /** Signed net of transfer rules and quotas (estimate-based). */
  transfersCents: number;
  netCents: number;
}

/** Typical month per account from active, not yet ended rules and quotas. */
export function monthlySummary(accountIds: string[], rules: RecurringRule[], contributions: ContributionRule[], today: string): Record<string, AccountMonthlySummary> {
  const out: Record<string, AccountMonthlySummary> = {};
  const slot = (id: string) => (out[id] ??= { rulesIncomeCents: 0, rulesExpenseCents: 0, transfersCents: 0, netCents: 0 });
  const live = (p: { active: boolean; endDate: string | null }) => p.active && !(p.endDate && p.endDate < today);
  for (const id of accountIds) slot(id);
  for (const r of rules) {
    if (!live(r)) continue;
    const m = monthlyEquivalent(r);
    if (r.kind === "transfer") {
      slot(r.accountId).transfersCents += m;
      if (r.counterpartAccountId) slot(r.counterpartAccountId).transfersCents -= m;
    } else if (m >= 0) slot(r.accountId).rulesIncomeCents += m;
    else slot(r.accountId).rulesExpenseCents -= m;
  }
  for (const c of contributions) {
    if (!live(c)) continue;
    const amount = c.fixedCents + Math.round((c.estimatedSpendingCents * c.sharePercent) / 100);
    slot(c.fromAccountId).transfersCents -= amount;
    slot(c.toAccountId).transfersCents += amount;
  }
  for (const s of Object.values(out)) s.netCents = s.rulesIncomeCents - s.rulesExpenseCents + s.transfersCents;
  return out;
}
