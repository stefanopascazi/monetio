// Historical averages used by projections for everything recurring rules do not cover
// (e.g. salary without a rule, day-to-day spending, irregular income).
import { FREQUENCY_MONTHS } from "./recurrence";
import type { ContributionRule, RecurringRule } from "./types";

export interface FlowLike {
  accountId: string;
  /** `YYYY-MM` */
  month: string;
  categoryId: string | null;
  kind: "income" | "expense" | "transfer" | "adjustment";
  totalCents: number;
}

export interface CategoryAverage {
  categoryId: string | null;
  /** Signed monthly average (positive = money in). */
  avgCents: number;
}

export interface AccountBaseline {
  /** Positive monthly averages of uncovered income and spending. */
  incomeCents: number;
  expenseCents: number;
  /** Largest contributions first. */
  categories: CategoryAverage[];
}

/** Monthly amounts (signed) that rules already project, so history must not count them again. */
export interface RuleCoverage {
  /** Per paying account and category: every rule kind, estimates of transfers included. */
  byAccount: Map<string, Map<string, number>>;
  /**
   * Categories budgeted by a spending/income estimate: the estimate replaces their history on
   * every account (e.g. "Spesa del mese" on the card also stands for past spending on the joint).
   */
  shared: Map<string, number>;
}

/** Monthly equivalent of the active, not yet ended rules with a category. */
export function ruleCoverage(
  rules: Pick<RecurringRule, "accountId" | "categoryId" | "active" | "schedule" | "kind" | "amountCents" | "frequency" | "endDate">[],
  today: string,
): RuleCoverage {
  const byAccount = new Map<string, Map<string, number>>();
  const shared = new Map<string, number>();
  for (const r of rules) {
    if (!r.active || !r.categoryId || (r.endDate && r.endDate < today)) continue;
    const m = monthlyEquivalent(r);
    if (r.schedule === "estimate" && r.kind !== "transfer") {
      shared.set(r.categoryId, (shared.get(r.categoryId) ?? 0) + m);
      continue;
    }
    if (!byAccount.has(r.accountId)) byAccount.set(r.accountId, new Map());
    const acc = byAccount.get(r.accountId)!;
    acc.set(r.categoryId, (acc.get(r.categoryId) ?? 0) + m);
  }
  return { byAccount, shared };
}

/**
 * Monthly average of a category, prudent on income: one-off income (a refund, a sale)
 * must not inflate every future month, so positive averages use the median when lower.
 */
export function prudentAverage(values: number[]): number {
  if (!values.length) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (mean <= 0) return Math.round(mean);
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length / 2;
  const median = sorted.length % 2 ? sorted[Math.floor(mid)] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(Math.min(mean, median));
}

/** What history adds on top of rules: same-sign amounts are subtracted, opposite ones dropped. */
export function residualAfterRules(avgCents: number, coveredCents: number | undefined): number {
  if (!coveredCents) return avgCents;
  if (Math.sign(avgCents) !== Math.sign(coveredCents)) return 0;
  // `|| 0` avoids -0 when the rule covers it all.
  return Math.sign(avgCents) * Math.max(0, Math.abs(avgCents) - Math.abs(coveredCents)) || 0;
}

/**
 * Monthly income and spending per account not already projected by rules, per category.
 * Transfers/adjustments are skipped (modelled by rules and quotas). A rule only removes its
 * own amount from the category history, so e.g. a yearly insurance in "Extra" does not hide
 * the rest of the extra spending.
 */
export function variableBaseline(flows: FlowLike[], months: string[], coverage: RuleCoverage = { byAccount: new Map(), shared: new Map() }): Record<string, AccountBaseline> {
  if (!months.length) return {};
  const index = new Map(months.map((m, i) => [m, i]));
  const series = new Map<string, Map<string | null, number[]>>();
  for (const f of flows) {
    const i = index.get(f.month);
    if (i === undefined || (f.kind !== "income" && f.kind !== "expense")) continue;
    if (!series.has(f.accountId)) series.set(f.accountId, new Map());
    const byCat = series.get(f.accountId)!;
    if (!byCat.has(f.categoryId)) byCat.set(f.categoryId, new Array(months.length).fill(0));
    byCat.get(f.categoryId)![i] += f.totalCents;
  }

  // Per account: history minus the rules paid from that account.
  const avgs = new Map<string, Map<string | null, number>>();
  for (const [accountId, byCat] of series) {
    const covered = coverage.byAccount.get(accountId);
    const out = new Map<string | null, number>();
    for (const [categoryId, values] of byCat) {
      const avg = prudentAverage(values);
      out.set(categoryId, categoryId ? residualAfterRules(avg, covered?.get(categoryId)) : avg);
    }
    avgs.set(accountId, out);
  }

  // Estimates are budgets declared by the user: they replace the category history everywhere.
  for (const categoryId of coverage.shared.keys()) for (const m of avgs.values()) m.delete(categoryId);

  const result: Record<string, AccountBaseline> = {};
  for (const [accountId, byCat] of avgs) {
    const categories = [...byCat.entries()]
      .map(([categoryId, avgCents]) => ({ categoryId, avgCents }))
      .filter((c) => c.avgCents !== 0)
      .sort((a, b) => Math.abs(b.avgCents) - Math.abs(a.avgCents));
    result[accountId] = {
      incomeCents: categories.filter((c) => c.avgCents > 0).reduce((s, c) => s + c.avgCents, 0),
      expenseCents: -categories.filter((c) => c.avgCents < 0).reduce((s, c) => s + c.avgCents, 0),
      categories,
    };
  }
  return result;
}

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
  variableIncomeCents: number;
  /** Positive. */
  variableExpenseCents: number;
  netCents: number;
}

/** Typical month per account: rules, quotas and historical averages, for explaining projections. */
export function monthlySummary(
  accountIds: string[],
  rules: RecurringRule[],
  contributions: ContributionRule[],
  baseline: Record<string, AccountBaseline>,
): Record<string, AccountMonthlySummary> {
  const out: Record<string, AccountMonthlySummary> = {};
  const slot = (id: string) =>
    (out[id] ??= { rulesIncomeCents: 0, rulesExpenseCents: 0, transfersCents: 0, variableIncomeCents: 0, variableExpenseCents: 0, netCents: 0 });
  for (const id of accountIds) slot(id);
  for (const r of rules) {
    if (!r.active) continue;
    const m = monthlyEquivalent(r);
    if (r.kind === "transfer") {
      slot(r.accountId).transfersCents += m;
      if (r.counterpartAccountId) slot(r.counterpartAccountId).transfersCents -= m;
    } else if (m >= 0) slot(r.accountId).rulesIncomeCents += m;
    else slot(r.accountId).rulesExpenseCents -= m;
  }
  for (const c of contributions) {
    if (!c.active) continue;
    const amount = c.fixedCents + Math.round((c.estimatedSpendingCents * c.sharePercent) / 100);
    slot(c.fromAccountId).transfersCents -= amount;
    slot(c.toAccountId).transfersCents += amount;
  }
  for (const [id, b] of Object.entries(baseline)) {
    slot(id).variableIncomeCents += b.incomeCents;
    slot(id).variableExpenseCents += b.expenseCents;
  }
  for (const s of Object.values(out)) {
    s.netCents = s.rulesIncomeCents - s.rulesExpenseCents + s.transfersCents + s.variableIncomeCents - s.variableExpenseCents;
  }
  return out;
}
