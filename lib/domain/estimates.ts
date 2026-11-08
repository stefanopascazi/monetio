// Decreasing estimates: booked movements in chosen categories reduce an estimate in its month.
import { endOfMonth, startOfMonth } from "./dates";
import { occurrences } from "./recurrence";
import type { ISODate, RecurringRule } from "./types";

/** Booked, signed movement that can reduce decreasing estimates (not flagged `skipEstimates`). */
export interface EstimateMovement {
  accountId: string;
  categoryId: string;
  amountCents: number;
}

export const isDecreasing = (r: Pick<RecurringRule, "schedule" | "decrementCategoryIds">) => r.schedule === "estimate" && r.decrementCategoryIds.length > 0;

/**
 * Shared pool of booked amounts per account and category. Each draw consumes what it takes,
 * so one movement never reduces two estimates. Spending reduces expense estimates, money
 * received reduces income ones (refunds offset spending in the same category).
 */
export function estimatePool(movements: EstimateMovement[]) {
  const net = new Map<string, number>();
  for (const m of movements) {
    const k = `${m.accountId}|${m.categoryId}`;
    net.set(k, (net.get(k) ?? 0) + m.amountCents);
  }
  /** Takes up to `cents` (positive) for `rule` from its categories; returns what was taken. */
  return (rule: Pick<RecurringRule, "accountId" | "amountCents" | "decrementCategoryIds">, cents: number): number => {
    const sign = Math.sign(rule.amountCents) || -1;
    let taken = 0;
    for (const c of rule.decrementCategoryIds) {
      if (taken >= cents) break;
      const k = `${rule.accountId}|${c}`;
      const available = Math.max(0, sign * (net.get(k) ?? 0));
      const take = Math.min(available, cents - taken);
      net.set(k, (net.get(k) ?? 0) - sign * take);
      taken += take;
    }
    return taken;
  };
}

/** Scheduled date of a rule occurrence from its period (`YYYY-MM`, or the date for weekly rules). */
export function occurrenceOfPeriod(rule: Pick<RecurringRule, "frequency" | "dayOfMonth" | "startDate" | "endDate">, period: string): ISODate | null {
  const [from, to] = rule.frequency === "weekly" ? [period, period] : [startOfMonth(period), endOfMonth(period)];
  return occurrences(rule, from, to)[0] ?? null;
}
