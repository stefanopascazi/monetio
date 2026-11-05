import type { DueEntry } from "../domain/schedule";
import type { ISODate } from "../domain/types";

export interface PendingTransfers {
  /** Positive cents still to send from this account. */
  outCents: number;
  /** Positive cents still to receive on this account. */
  inCents: number;
  count: number;
}

/** Unpaid transfers (rules and quotas) due up to `until`, per account on both sides. */
export function pendingTransfersByAccount(entries: DueEntry[], until: ISODate): Record<string, PendingTransfers> {
  const out: Record<string, PendingTransfers> = {};
  const slot = (id: string) => (out[id] ??= { outCents: 0, inCents: 0, count: 0 });
  for (const e of entries) {
    if (e.kind !== "transfer" || !e.counterpartAccountId || e.date > until) continue;
    const amount = Math.abs(e.amountCents);
    // amountCents is signed for accountId: negative means it sends money to the counterpart.
    const [from, to] = e.amountCents <= 0 ? [e.accountId, e.counterpartAccountId] : [e.counterpartAccountId, e.accountId];
    slot(from).outCents += amount;
    slot(from).count++;
    slot(to).inCents += amount;
    slot(to).count++;
  }
  return out;
}
