// Bank movements not booked yet (card payments, holds): already out of the available balance, so the
// projection starts from it. What the projection already expects must not be counted twice.
import { monthKey } from "./dates";
import type { Movement } from "./projection";
import type { ISODate } from "./types";

/** A pending movement as the bank lists it. */
export type PendingItem = { amountCents: number; date: ISODate; description: string };

/**
 * Pending money of one account for the projection: listed items (with the category the account's
 * matches give them) or, when the bank lists none, only the gap between available and booked balance.
 */
export type AccountPending = { items: { amountCents: number; categoryId: string | null }[] } | { totalCents: number };

/** Relative amount gap still matching a due movement (as the bank sync matcher). */
export const PENDING_AMOUNT_TOLERANCE = 0.2;

/** Due outflows expected today or earlier (moved to today), estimates excluded. */
function isDueOutflow(m: Movement, accountId: string, today: ISODate): boolean {
  return m.accountId === accountId && m.date <= today && m.amountCents < 0 && m.source !== "estimate";
}

/**
 * Removes from the projected movements what a pending bank movement already covers:
 * a due outflow of about the same amount, or part of the current month's estimate of its category.
 * Without a list, due outflows are dropped while they fit in the pending total.
 */
export function settlePending(movements: Movement[], pending: Record<string, AccountPending>, today: ISODate): Movement[] {
  const out = movements.map((m) => ({ ...m }));
  const removed = new Set<Movement>();
  const month = monthKey(today);
  for (const [accountId, p] of Object.entries(pending)) {
    const due = () => out.filter((m) => !removed.has(m) && isDueOutflow(m, accountId, today));
    if ("totalCents" in p) {
      let left = p.totalCents;
      for (const m of due()) {
        if (left >= 0) break;
        if (m.amountCents >= left) {
          removed.add(m);
          left -= m.amountCents;
        }
      }
      continue;
    }
    for (const item of p.items) {
      if (item.amountCents >= 0) continue;
      const match = due()
        .filter((m) => Math.abs(m.amountCents - item.amountCents) <= Math.abs(m.amountCents) * PENDING_AMOUNT_TOLERANCE)
        .sort((a, b) => Math.abs(a.amountCents - item.amountCents) - Math.abs(b.amountCents - item.amountCents))[0];
      if (match) {
        removed.add(match);
        continue;
      }
      // Spent from a budget: the estimate's remainder shrinks by the payment.
      const estimate = item.categoryId
        ? out.find((m) => !removed.has(m) && m.accountId === accountId && m.source === "estimate" && m.amountCents < 0 && m.categoryId === item.categoryId && monthKey(m.date) === month)
        : undefined;
      if (estimate) {
        estimate.amountCents = Math.min(0, estimate.amountCents - item.amountCents);
        if (estimate.amountCents === 0) removed.add(estimate);
      }
    }
  }
  return out.filter((m) => !removed.has(m));
}

/** Start balances lowered by the pending outflows (never raised: incoming money is counted once booked). */
export function withPendingStart(balances: Record<string, number>, pendingCents: Record<string, number>): Record<string, number> {
  const out = { ...balances };
  for (const [id, cents] of Object.entries(pendingCents)) if (id in out && cents < 0) out[id] += cents;
  return out;
}
