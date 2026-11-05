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

/** Key of categories covered on every account. */
export const ALL_ACCOUNTS = "*";

/**
 * Categories whose history is replaced by rules: per account for regular rules, and on every
 * account for estimates (a budget like "Spesa del mese" stands for the whole category,
 * even if past spending was booked on another account).
 */
export function coveredCategories(rules: Pick<RecurringRule, "accountId" | "categoryId" | "active" | "schedule">[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  const add = (key: string, cat: string) => {
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(cat);
  };
  for (const r of rules) {
    if (!r.active || !r.categoryId) continue;
    add(r.accountId, r.categoryId);
    if (r.schedule === "estimate") add(ALL_ACCOUNTS, r.categoryId);
  }
  return map;
}

/**
 * Average monthly income and spending per account over `months`, per category, skipping
 * transfers/adjustments (modelled by rules and quotas) and categories covered by rules.
 */
export function variableBaseline(flows: FlowLike[], months: string[], covered: Map<string, Set<string>>): Record<string, AccountBaseline> {
  if (!months.length) return {};
  const inRange = new Set(months);
  const sums = new Map<string, Map<string | null, number>>();
  for (const f of flows) {
    if (!inRange.has(f.month) || (f.kind !== "income" && f.kind !== "expense")) continue;
    if (f.categoryId && (covered.get(f.accountId)?.has(f.categoryId) || covered.get(ALL_ACCOUNTS)?.has(f.categoryId))) continue;
    if (!sums.has(f.accountId)) sums.set(f.accountId, new Map());
    const byCat = sums.get(f.accountId)!;
    byCat.set(f.categoryId, (byCat.get(f.categoryId) ?? 0) + f.totalCents);
  }
  const out: Record<string, AccountBaseline> = {};
  for (const [accountId, byCat] of sums) {
    const categories = [...byCat.entries()]
      .map(([categoryId, total]) => ({ categoryId, avgCents: Math.round(total / months.length) }))
      .filter((c) => c.avgCents !== 0)
      .sort((a, b) => Math.abs(b.avgCents) - Math.abs(a.avgCents));
    out[accountId] = {
      incomeCents: categories.filter((c) => c.avgCents > 0).reduce((s, c) => s + c.avgCents, 0),
      expenseCents: -categories.filter((c) => c.avgCents < 0).reduce((s, c) => s + c.avgCents, 0),
      categories,
    };
  }
  return out;
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
