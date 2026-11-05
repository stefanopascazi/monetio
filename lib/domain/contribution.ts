import { monthKey } from "./dates";
import type { ContributionRule, Transaction } from "./types";

/** Rounds positive cents up to the next multiple of `step` (spreadsheet CEILING). */
export function ceilToStep(cents: number, step: number): number {
  if (cents <= 0) return 0;
  return Math.ceil(cents / step) * step;
}

/** Net spending (positive cents) booked on an account in the given categories during a month. */
export function categorySpending(txns: Transaction[], accountId: string, categoryIds: string[], month: string): number {
  const cats = new Set(categoryIds);
  const net = txns
    .filter((t) => t.status === "booked" && t.accountId === accountId && t.categoryId && cats.has(t.categoryId) && monthKey(t.bookedOn) === month)
    .filter((t) => t.kind === "expense" || t.kind === "income")
    .reduce((sum, t) => sum + t.amountCents, 0);
  return Math.max(0, -net);
}

/** Amount to transfer: fixed part + share of the spending, rounded up. */
export function contributionAmount(
  rule: Pick<ContributionRule, "fixedCents" | "sharePercent" | "roundingCents">,
  spendingCents: number,
): number {
  return rule.fixedCents + ceilToStep(Math.round((spendingCents * rule.sharePercent) / 100), rule.roundingCents);
}
