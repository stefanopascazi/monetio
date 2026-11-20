// One sync of one bank account: balance, booked movements since the last sync, matching, writes.
// Network and database are injected: the worker provides them, tests fake them.
import { addDays } from "../../domain/dates.ts";
import type { ISODate } from "../../domain/types.ts";
import type { BalanceResource, TransactionResource } from "../enable-banking/types.ts";
import { type CategoryHints, withMatchedCategories } from "./categories.ts";
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
  /** First day chosen by the owner when confirming the preview; null before that. */
  syncFrom: ISODate | null;
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
  /** Category matches of the account and the household categories. */
  loadCategoryHints?(target: SyncTarget): Promise<CategoryHints>;
  apply(target: SyncTarget, decisions: Decision[]): Promise<void>;
  saveStatus(bankAccountId: string, status: { syncedAt: Date; balance: { cents: number; date: ISODate | null } | null; error: string | null }): Promise<void>;
};

export type SyncCounts = { inserted: number; reconciled: number; review: number; skipped: number };

/** Days re-read on every sync: banks may book late or fix a movement. */
export const OVERLAP_DAYS = 7;
/** History fetched on the first sync before the consent date (CSV imports cover older months). */
export const FIRST_SYNC_DAYS = 30;

const iso = (d: Date) => d.toISOString().slice(0, 10) as ISODate;

/** Oldest day a movement may be imported from: the opening date or the owner's choice, the later. */
export function syncFloor(target: Pick<SyncTarget, "openingDate" | "syncFrom">): ISODate {
  return target.syncFrom && target.syncFrom > target.openingDate ? target.syncFrom : target.openingDate;
}

export function syncFrom(target: SyncTarget): ISODate {
  const floor = syncFloor(target);
  // A day chosen by the owner and not synced yet (the preview): read exactly from there.
  if (!target.lastSyncedAt && target.syncFrom) return floor;
  const start = target.lastSyncedAt ? addDays(iso(target.lastSyncedAt), -OVERLAP_DAYS) : addDays(iso(target.connectionCreatedAt), -FIRST_SYNC_DAYS);
  return start < floor ? floor : start;
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

export type SyncPlan = {
  from: ISODate;
  decisions: Decision[];
  balance: { cents: number; date: ISODate | null } | null;
  fetched: number;
  balances: number;
};

/** Reads the bank and decides what each movement does, without writing anything. */
export async function planSync(target: SyncTarget, client: SyncClient, store: Pick<SyncStore, "loadExisting" | "loadCategoryHints">): Promise<SyncPlan> {
  const from = syncFrom(target);
  const floor = syncFloor(target);
  const [balances, items] = await Promise.all([client.getBalances(target.uid), client.getTransactions(target.uid, from)]);
  // Some banks return more than asked: the floor is enforced here too.
  const movements = normalizeTransactions(items)
    .filter((m) => m.bookedOn >= floor)
    .sort((a, b) => a.bookedOn.localeCompare(b.bookedOn));
  const { candidates, reviewRefs } = await store.loadExisting(target.accountId, addDays(from, -RULE_WINDOW_DAYS));
  const matched = matchMovements(movements, candidates, reviewRefs);
  const hints = matched.some((d) => d.type === "insert") && store.loadCategoryHints ? await store.loadCategoryHints(target) : null;
  const decisions = hints ? withMatchedCategories(matched, hints) : matched;
  const picked = pickBalance(balances);
  return { from, decisions, balance: picked && { cents: picked.cents, date: picked.date }, fetched: items.length, balances: balances.length };
}

export async function syncBankAccount(target: SyncTarget, client: SyncClient, store: SyncStore, now: Date): Promise<SyncResult> {
  const plan = await planSync(target, client, store);
  await store.apply(target, plan.decisions);
  await store.saveStatus(target.bankAccountId, { syncedAt: now, balance: plan.balance, error: null });
  return { ...countDecisions(plan.decisions), from: plan.from, fetched: plan.fetched, balances: plan.balances };
}
