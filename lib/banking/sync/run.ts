// One sync of one bank account: balance, booked movements since the last sync, matching, writes.
// Network and database are injected: the worker provides them, tests fake them.
import { addDays } from "../../domain/dates.ts";
import type { ISODate } from "../../domain/types.ts";
import type { BalanceResource, TransactionResource } from "../enable-banking/types.ts";
import { type Candidate, type Decision, matchMovements, RULE_WINDOW_DAYS } from "./match.ts";
import { normalizeTransactions, pickBalance } from "./normalize.ts";

export type SyncTarget = {
  bankAccountId: string;
  uid: string;
  userId: string;
  householdId: string;
  accountId: string;
  /** MonetIO account opening date: older movements are already in its opening balance. */
  openingDate: ISODate;
  lastSyncedAt: Date | null;
  connectionCreatedAt: Date;
};

export type SyncClient = {
  getBalances(uid: string): Promise<BalanceResource[]>;
  getTransactions(uid: string, dateFrom: string): Promise<TransactionResource[]>;
};

export type SyncStore = {
  /** Movements of the account from a date, and bank refs already queued for review. */
  loadExisting(accountId: string, from: ISODate): Promise<{ candidates: Candidate[]; reviewRefs: string[] }>;
  apply(target: SyncTarget, decisions: Decision[]): Promise<void>;
  saveStatus(bankAccountId: string, status: { syncedAt: Date; balance: { cents: number; date: ISODate | null } | null; error: string | null }): Promise<void>;
};

export type SyncCounts = { inserted: number; reconciled: number; review: number; skipped: number };

/** Days re-read on every sync: banks may book late or fix a movement. */
export const OVERLAP_DAYS = 7;
/** History fetched on the first sync before the consent date (CSV imports cover older months). */
export const FIRST_SYNC_DAYS = 30;

const iso = (d: Date) => d.toISOString().slice(0, 10) as ISODate;

export function syncFrom(target: SyncTarget): ISODate {
  const start = target.lastSyncedAt ? addDays(iso(target.lastSyncedAt), -OVERLAP_DAYS) : addDays(iso(target.connectionCreatedAt), -FIRST_SYNC_DAYS);
  return start < target.openingDate ? target.openingDate : start;
}

export function countDecisions(decisions: Decision[]): SyncCounts {
  const counts: SyncCounts = { inserted: 0, reconciled: 0, review: 0, skipped: 0 };
  for (const d of decisions) {
    if (d.type === "insert") counts.inserted++;
    else if (d.type === "reconcile") counts.reconciled++;
    else if (d.type === "review") counts.review++;
    else counts.skipped++;
  }
  return counts;
}

/** Decision counts plus what the bank returned, for the worker log. */
export type SyncResult = SyncCounts & { from: ISODate; fetched: number; balances: number };

export async function syncBankAccount(target: SyncTarget, client: SyncClient, store: SyncStore, now: Date): Promise<SyncResult> {
  const from = syncFrom(target);
  const [balances, items] = await Promise.all([client.getBalances(target.uid), client.getTransactions(target.uid, from)]);
  const movements = normalizeTransactions(items)
    .filter((m) => m.bookedOn >= target.openingDate)
    .sort((a, b) => a.bookedOn.localeCompare(b.bookedOn));
  const { candidates, reviewRefs } = await store.loadExisting(target.accountId, addDays(from, -RULE_WINDOW_DAYS));
  const decisions = matchMovements(movements, candidates, reviewRefs);
  await store.apply(target, decisions);
  const balance = pickBalance(balances);
  await store.saveStatus(target.bankAccountId, { syncedAt: now, balance: balance && { cents: balance.cents, date: balance.date }, error: null });
  return { ...countDecisions(decisions), from, fetched: items.length, balances: balances.length };
}
