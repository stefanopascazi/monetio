import "server-only";
import { cache } from "react";
import type { Account, Category, ContributionRule, ISODate, OccurrenceOverride, RecurringRule, Transaction } from "../domain/types";
import { createClient } from "../supabase/server";
import { activeHouseholdId } from "./context";
import { type MonthlyFlow, mapFlow } from "./flows";
import { attachFees, mapAccount, mapCategory, mapContribution, mapRule, mapTransaction } from "./mappers";
import { hiddenAccountName } from "./views";

export interface AccountWithBalance extends Account {
  balanceCents: number;
}

export const listAccounts = cache(async (): Promise<AccountWithBalance[]> => {
  const [supabase, hh] = await Promise.all([createClient(), activeHouseholdId()]);
  const [{ data: accounts, error }, { data: balances }] = await Promise.all([
    supabase.from("accounts").select("*").eq("household_id", hh).order("sort_order").order("name"),
    supabase.from("account_balances").select("account_id, balance_cents").eq("household_id", hh),
  ]);
  if (error) throw error;
  const map = new Map((balances ?? []).map((b) => [String(b.account_id), Number(b.balance_cents)]));
  return (accounts ?? []).map((a) => {
    const acc = mapAccount(a);
    return { ...acc, balanceCents: map.get(acc.id) ?? acc.openingBalanceCents };
  });
});

export const listCategories = cache(async (): Promise<Category[]> => {
  const [supabase, hh] = await Promise.all([createClient(), activeHouseholdId()]);
  const { data, error } = await supabase.from("categories").select("*").eq("household_id", hh).is("archived_at", null).order("name");
  if (error) throw error;
  return (data ?? []).map(mapCategory);
});

export interface TransactionFilter {
  accountId?: string;
  categoryId?: string;
  from?: ISODate;
  to?: ISODate;
  search?: string;
  status?: "booked" | "planned";
  limit?: number;
}

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Maps rows and attaches the fee total of bonifico/CBill payments and transfers with separate
 * queries (no PostgREST embedding: it depends on the relationship being in the schema cache).
 */
async function withFees(supabase: Client, rows: Record<string, unknown>[]): Promise<Transaction[]> {
  const txns = rows.map(mapTransaction);
  const transfers = txns.filter((t) => t.transferGroupId && !t.parentTransactionId);
  const sides = transfers.map((t) => ({ id: t.id, groupId: t.transferGroupId! }));
  // Receiving sides: their fee hangs on the paying side, which may not be listed.
  const incoming = transfers.filter((t) => t.amountCents > 0).map((t) => t.transferGroupId!);
  if (incoming.length) {
    const { data, error } = await supabase.from("transactions").select("id, transfer_group_id").in("transfer_group_id", incoming).lt("amount_cents", 0).is("parent_transaction_id", null);
    if (error) throw error;
    for (const r of data ?? []) sides.push({ id: String(r.id), groupId: String(r.transfer_group_id) });
  }
  const ids = [...new Set([...txns.filter((t) => t.paymentMethod).map((t) => t.id), ...sides.map((s) => s.id)])];
  if (!ids.length) return txns;
  const { data, error } = await supabase.from("transactions").select("parent_transaction_id, amount_cents").in("parent_transaction_id", ids);
  if (error) throw error;
  const fees = (data ?? []).map((r) => ({ parentId: String(r.parent_transaction_id), amountCents: Number(r.amount_cents) }));
  return attachFees(txns, fees, sides);
}

export async function listTransactions(f: TransactionFilter = {}): Promise<Transaction[]> {
  const [supabase, hh] = await Promise.all([createClient(), activeHouseholdId()]);
  let q = supabase.from("transactions").select("*").eq("household_id", hh).order("booked_on", { ascending: false }).order("id", { ascending: false });
  if (f.accountId) q = q.eq("account_id", f.accountId);
  if (f.categoryId) q = q.eq("category_id", f.categoryId);
  if (f.from) q = q.gte("booked_on", f.from);
  if (f.to) q = q.lte("booked_on", f.to);
  if (f.status) q = q.eq("status", f.status);
  if (f.search) q = q.ilike("description", `%${f.search.replace(/[%_]/g, "")}%`);
  const { data, error } = await q.limit(f.limit ?? 500);
  if (error) throw error;
  return withFees(supabase, data ?? []);
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("transactions").select("*").eq("id", id).maybeSingle();
  return data ? (await withFees(supabase, [data]))[0] : null;
}

export interface AuditEntry {
  id: number;
  action: "update" | "delete";
  changedAt: string;
  previous: Transaction;
}

export async function listAudit(transactionId: string): Promise<AuditEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("transaction_audit").select("*").eq("transaction_id", transactionId).order("changed_at", { ascending: false });
  return (data ?? []).map((r) => ({ id: Number(r.id), action: r.action, changedAt: String(r.changed_at), previous: mapTransaction(r.previous) }));
}

export const listRules = cache(async (): Promise<RecurringRule[]> => {
  const [supabase, hh] = await Promise.all([createClient(), activeHouseholdId()]);
  const { data, error } = await supabase.from("recurring_rules").select("*").eq("household_id", hh).order("description");
  if (error) throw error;
  return (data ?? []).map(mapRule);
});

export const listContributions = cache(async (): Promise<ContributionRule[]> => {
  const [supabase, hh] = await Promise.all([createClient(), activeHouseholdId()]);
  const { data, error } = await supabase.from("contribution_rules").select("*").eq("household_id", hh).order("description");
  if (error) throw error;
  return (data ?? []).map(mapContribution);
});

/** Monthly aggregates since a month (`YYYY-MM-DD`, first of month). */
export const listFlows = cache(async (since: ISODate): Promise<MonthlyFlow[]> => {
  const [supabase, hh] = await Promise.all([createClient(), activeHouseholdId()]);
  const rows: MonthlyFlow[] = [];
  // Page through the view: PostgREST returns at most 1000 rows per request.
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("monthly_flows").select("*").eq("household_id", hh).gte("month", since).range(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []).map(mapFlow));
    if (!data || data.length < 1000) break;
  }
  return rows;
});

export interface MonthlyBalance {
  accountId: string;
  month: string;
  balanceCents: number;
}

export const listMonthlyBalances = cache(async (since: ISODate): Promise<MonthlyBalance[]> => {
  const [supabase, hh] = await Promise.all([createClient(), activeHouseholdId()]);
  const { data, error } = await supabase.from("monthly_balances").select("*").eq("household_id", hh).gte("month", since).order("month");
  if (error) throw error;
  return (data ?? []).map((r) => ({ accountId: String(r.account_id), month: String(r.month).slice(0, 7), balanceCents: Number(r.balance_cents) }));
});

/** Rule/contribution occurrences already booked since a date. */
export const listBookedOccurrences = cache(async (since: ISODate) => {
  const [supabase, hh] = await Promise.all([createClient(), activeHouseholdId()]);
  const { data, error } = await supabase
    .from("transactions")
    .select("recurring_rule_id, contribution_rule_id, occurrence_date")
    .eq("household_id", hh)
    .gte("occurrence_date", since)
    .or("recurring_rule_id.not.is.null,contribution_rule_id.not.is.null")
    .limit(5000);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    recurringRuleId: r.recurring_rule_id as string | null,
    contributionRuleId: r.contribution_rule_id as string | null,
    occurrenceDate: r.occurrence_date as string | null,
  }));
});

export async function balanceBefore(accountId: string, date: ISODate): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("balance_before", { p_account: accountId, p_date: date });
  if (error) throw error;
  return Number(data ?? 0);
}

/** Accounts the viewer cannot see, labelled with their owner (e.g. "Conto privato di Asha"). */
export const listHiddenAccounts = cache(async (): Promise<{ id: string; name: string }[]> => {
  const [supabase, hh] = await Promise.all([createClient(), activeHouseholdId()]);
  const { data, error } = await supabase.rpc("hidden_account_owners", { p_household: hh });
  if (error) throw error;
  return ((data ?? []) as { id: string; owner_name: string | null }[]).map((r) => ({ id: String(r.id), name: hiddenAccountName(r.owner_name) }));
});

export const listOverrides = cache(async (): Promise<OccurrenceOverride[]> => {
  const [supabase, hh] = await Promise.all([createClient(), activeHouseholdId()]);
  const { data, error } = await supabase.from("rule_occurrence_overrides").select("rule_id, period, amount_cents, due_date, note").eq("household_id", hh);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ruleId: String(r.rule_id),
    period: String(r.period),
    amountCents: Number(r.amount_cents),
    dueDate: String(r.due_date),
    note: r.note == null ? null : String(r.note),
  }));
});
