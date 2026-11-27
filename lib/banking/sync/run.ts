// One sync of one bank account: balance, booked movements since the last sync, matching, writes.
// Network and database are injected: the worker provides them, tests fake them.
import { addDays, todayISO } from "../../domain/dates.ts";
import type { PendingItem } from "../../domain/pending.ts";
import type { ISODate } from "../../domain/types.ts";
import type { BalanceResource, TransactionResource } from "../enable-banking/types.ts";
import { type CategoryHints, withMatchedCategories } from "./categories.ts";
import { assignExecutionDates, EMPTY_LEDGER, nextLedger, type PendingLedger } from "./execution.ts";
import { genericAmounts, type HistoryMovement, INFER_HISTORY_DAYS, withInferredDetails } from "./infer.ts";
import { type Candidate, type Decision, matchMovements, RULE_WINDOW_DAYS } from "./match.ts";
import { normalizePending, normalizeTransactions, pickBalances } from "./normalize.ts";

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
  /** Pending outflows seen by earlier syncs, to date movements when they are booked (#133). */
  pendingLedger?: PendingLedger | null;
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
  /** Categorised movements of the account with these amounts from a date, evidence for inference (#132). */
  loadInferenceHistory?(accountId: string, amounts: number[], from: ISODate): Promise<HistoryMovement[]>;
  apply(target: SyncTarget, decisions: Decision[]): Promise<void>;
  /** MonetIO booked balance of the account, read after `apply`. */
  loadBookedBalance?(accountId: string): Promise<number>;
  saveStatus(bankAccountId: string, status: SyncStatus): Promise<void>;
};

export type BankBalance = { cents: number; date: ISODate | null };

/** `balance`: booked balance; `available`: what can be spent, pending card payments included. */
/** `pending`: movements the bank lists as not booked yet. */
/** `ledger`: pending outflows to keep for the next sync (#133). */
export type SyncStatus = { syncedAt: Date; balance: BankBalance | null; available?: BankBalance | null; pending?: PendingItem[]; ledger?: PendingLedger; error: string | null };

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
export type SyncResult = SyncCounts & { from: ISODate; fetched: number; balances: number; balanceTypes: string[]; pending: number };

export type SyncPlan = {
  from: ISODate;
  decisions: Decision[];
  balance: BankBalance | null;
  available: BankBalance | null;
  pending: PendingItem[];
  /** Ledger left once the new movements took their execution dates. */
  ledger: PendingLedger;
  fetched: number;
  balances: number;
  /** Balance types offered by the bank, logged to tell booked from available ones. */
  balanceTypes: string[];
};

/** Reads the bank and decides what each movement does, without writing anything. */
export async function planSync(
  target: SyncTarget,
  client: SyncClient,
  store: Pick<SyncStore, "loadExisting" | "loadCategoryHints" | "loadInferenceHistory">,
): Promise<SyncPlan> {
  const from = syncFrom(target);
  const floor = syncFloor(target);
  const [balances, items] = await Promise.all([client.getBalances(target.uid), client.getTransactions(target.uid, from)]);
  // Some banks return more than asked (Trade Republic: always the latest 100): older movements were
  // settled by earlier syncs and fall outside the candidates loaded below.
  const start = from > floor ? from : floor;
  const movements = normalizeTransactions(items)
    .filter((m) => m.bookedOn >= start)
    .sort((a, b) => a.bookedOn.localeCompare(b.bookedOn));
  const { candidates, reviewRefs } = await store.loadExisting(target.accountId, addDays(from, -RULE_WINDOW_DAYS));
  const matched = matchMovements(movements, candidates, reviewRefs);
  const hints = matched.some((d) => d.type === "insert") && store.loadCategoryHints ? await store.loadCategoryHints(target) : null;
  const categorised = hints ? withMatchedCategories(matched, hints) : matched;
  const amounts = genericAmounts(categorised);
  const history = hints && amounts.length && store.loadInferenceHistory ? await store.loadInferenceHistory(target.accountId, amounts, addDays(from, -INFER_HISTORY_DAYS)) : [];
  const inferred = hints ? withInferredDetails(categorised, history, hints.categories) : categorised;
  const dated = assignExecutionDates(inferred, target.pendingLedger ?? EMPTY_LEDGER);
  const decisions = dated.decisions;
  const { booked, available } = pickBalances(balances);
  return {
    from,
    decisions,
    balance: booked && { cents: booked.cents, date: booked.date },
    available: available && { cents: available.cents, date: available.date },
    pending: normalizePending(items),
    ledger: dated.ledger,
    fetched: items.length,
    balances: balances.length,
    balanceTypes: balances.map((b) => b.balance_type ?? "?"),
  };
}

/** Available minus booked balance (the bank's, else MonetIO's after the sync); null when unknown. */
async function pendingGap(target: SyncTarget, plan: SyncPlan, store: SyncStore): Promise<number | null> {
  if (!plan.available) return null;
  if (plan.balance) return plan.available.cents - plan.balance.cents;
  return store.loadBookedBalance ? plan.available.cents - (await store.loadBookedBalance(target.accountId)) : null;
}

export async function syncBankAccount(target: SyncTarget, client: SyncClient, store: SyncStore, now: Date): Promise<SyncResult> {
  const plan = await planSync(target, client, store);
  await store.apply(target, plan.decisions);
  const ledger = nextLedger({ ledger: plan.ledger, pending: plan.pending, gapCents: await pendingGap(target, plan, store), today: todayISO(now) });
  await store.saveStatus(target.bankAccountId, { syncedAt: now, balance: plan.balance, available: plan.available, pending: plan.pending, ledger, error: null });
  return { ...countDecisions(plan.decisions), from: plan.from, fetched: plan.fetched, balances: plan.balances, balanceTypes: plan.balanceTypes, pending: plan.pending.length };
}
