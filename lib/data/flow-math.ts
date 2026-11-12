// Pure math over the `monthly_flows` aggregate, free of UI types (shared with the VPS worker).
import type { ContributionRule, RecurringRule } from "../domain/types";

export interface MonthlyFlow {
  accountId: string;
  /** `YYYY-MM` */
  month: string;
  categoryId: string | null;
  kind: "income" | "expense" | "transfer" | "adjustment";
  counterpartAccountId: string | null;
  totalCents: number;
}

export function mapFlow(r: Record<string, unknown>): MonthlyFlow {
  return {
    accountId: String(r.account_id),
    month: String(r.month).slice(0, 7),
    categoryId: r.category_id == null ? null : String(r.category_id),
    kind: r.kind as MonthlyFlow["kind"],
    counterpartAccountId: r.counterpart_account_id == null ? null : String(r.counterpart_account_id),
    totalCents: Number(r.total_cents),
  };
}

/** Net spending (positive) on an account in some categories during a month. */
export function spentIn(flows: MonthlyFlow[], accountId: string, categoryIds: string[] | null, month: string): number {
  const net = flows
    .filter((f) => f.accountId === accountId && f.month === month && (f.kind === "expense" || f.kind === "income"))
    .filter((f) => categoryIds === null || (f.categoryId !== null && categoryIds.includes(f.categoryId)))
    .reduce((s, f) => s + f.totalCents, 0);
  return Math.max(0, -net);
}

export const contributionSpendingFrom = (flows: MonthlyFlow[]) => (rule: ContributionRule, month: string) =>
  spentIn(flows, rule.spendingAccountId ?? rule.toAccountId, rule.categoryIds, month);

/**
 * Amount already booked in a month towards an estimate rule (positive cents): spending for an expense,
 * money received for an income, transfers to the same counterpart for a transfer.
 */
export const estimateUsedFrom =
  (flows: MonthlyFlow[]) =>
  (rule: Pick<RecurringRule, "accountId" | "categoryId" | "kind" | "counterpartAccountId" | "amountCents">, month: string): number => {
    const net = flows
      .filter((f) => f.accountId === rule.accountId && f.month === month)
      .filter((f) =>
        rule.kind === "transfer" ? f.kind === "transfer" && f.counterpartAccountId === rule.counterpartAccountId : f.kind === "expense" || f.kind === "income",
      )
      .filter((f) => rule.categoryId === null || f.categoryId === rule.categoryId)
      .reduce((s, f) => s + f.totalCents, 0);
    return Math.max(0, Math.sign(rule.amountCents) * net);
  };
