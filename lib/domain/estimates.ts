// Decreasing estimates: booked movements in chosen categories reduce an estimate in its month.
import { endOfMonth, startOfMonth } from "./dates";
import { occurrences } from "./recurrence";
import type { ISODate, RecurringRule } from "./types";

/** Booked, signed movement that can reduce decreasing estimates (not flagged `skipEstimates`). */
export interface EstimateMovement {
  id: string;
  accountId: string;
  categoryId: string;
  amountCents: number;
  description: string;
  bookedOn: ISODate;
}

/** Share of a booked movement that went into an estimate (signed like the movement; refunds offset). */
export interface EstimatePart {
  id: string;
  description: string;
  bookedOn: ISODate;
  amountCents: number;
}

/** What a decreasing estimate has consumed so far in its month. */
export interface EstimateUsage {
  /** Full estimate (positive cents). */
  totalCents: number;
  /** Booked so far towards it (positive cents, at most `totalCents`). */
  usedCents: number;
  parts: EstimatePart[];
}

export const isDecreasing = (r: Pick<RecurringRule, "schedule" | "decrementCategoryIds">) => r.schedule === "estimate" && r.decrementCategoryIds.length > 0;

/**
 * Shared pool of booked amounts per account and category. Each draw consumes what it takes,
 * so one movement never reduces two estimates beyond its amount. Spending reduces expense
 * estimates, money received reduces income ones (refunds offset spending in the same category).
 * Every draw also tells which movements it consumed, oldest first.
 */
export function estimatePool(movements: EstimateMovement[]) {
  const byKey = new Map<string, { m: EstimateMovement; left: number }[]>();
  const sorted = [...movements].sort((a, b) => a.bookedOn.localeCompare(b.bookedOn) || a.id.localeCompare(b.id));
  for (const m of sorted) {
    const k = `${m.accountId}|${m.categoryId}`;
    byKey.set(k, [...(byKey.get(k) ?? []), { m, left: m.amountCents }]);
  }
  /** Takes up to `cents` (positive) for `rule` from its categories; returns what was taken and from which movements. */
  return (rule: Pick<RecurringRule, "accountId" | "amountCents" | "decrementCategoryIds">, cents: number): { takenCents: number; parts: EstimatePart[] } => {
    const sign = Math.sign(rule.amountCents) || -1;
    const parts: EstimatePart[] = [];
    const add = (m: EstimateMovement, amountCents: number) => parts.push({ id: m.id, description: m.description, bookedOn: m.bookedOn, amountCents });
    let taken = 0;
    for (const c of rule.decrementCategoryIds) {
      if (taken >= cents) break;
      const entries = byKey.get(`${rule.accountId}|${c}`) ?? [];
      const available = Math.max(0, sign * entries.reduce((s, e) => s + e.left, 0));
      const take = Math.min(available, cents - taken);
      if (take <= 0) continue;
      // Refunds are consumed first, so the movements taken net exactly `take`.
      let need = take;
      for (const e of entries) {
        if (sign * e.left >= 0) continue;
        need += -sign * e.left;
        add(e.m, e.left);
        e.left = 0;
      }
      for (const e of entries) {
        if (need <= 0) break;
        if (sign * e.left <= 0) continue;
        const t = Math.min(sign * e.left, need);
        add(e.m, sign * t);
        e.left -= sign * t;
        need -= t;
      }
      taken += take;
    }
    parts.sort((a, b) => a.bookedOn.localeCompare(b.bookedOn));
    return { takenCents: taken, parts };
  };
}

/** Scheduled date of a rule occurrence from its period (`YYYY-MM`, or the date for weekly rules). */
export function occurrenceOfPeriod(rule: Pick<RecurringRule, "frequency" | "dayOfMonth" | "startDate" | "endDate">, period: string): ISODate | null {
  const [from, to] = rule.frequency === "weekly" ? [period, period] : [startOfMonth(period), endOfMonth(period)];
  return occurrences(rule, from, to)[0] ?? null;
}
