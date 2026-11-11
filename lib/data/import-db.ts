import "server-only";
import { addDays } from "../domain/dates";
import type { ISODate, RuleFrequency } from "../domain/types";
import type { CategorisedMovement } from "../import/categories";
import { POSSIBLE_WINDOW_DAYS } from "../import/classify";
import type { Movement } from "../import/dedup";
import type { ExistingRule, PastMovement } from "../import/recurring";
import { TRANSFER_WINDOW_DAYS, type TransferCandidate } from "../import/transfers";
import type { ImportDraft } from "../import/types";
import { isUUID } from "../forms/parse";
import type { createClient } from "../supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;
const PAGE = 1000;

function dateRange(drafts: ImportDraft[], days: number): [ISODate, ISODate] {
  const dates = drafts.map((d) => d.bookedOn).sort();
  return [addDays(dates[0], -days), addDays(dates[dates.length - 1], days)];
}

/** Reads every page of a ranged query (PostgREST caps responses at 1000 rows). */
async function allPages<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>, maxRows = Infinity): Promise<T[]> {
  const out: T[] = [];
  for (let p = 0; ; p++) {
    const { data, error } = await page(p * PAGE, p * PAGE + PAGE - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGE || out.length >= maxRows) return out.slice(0, maxRows);
  }
}

/** Visible, active account of the current household (RLS hides the others). */
export async function loadImportAccount(supabase: Client, householdId: string, accountId: string) {
  if (!isUUID(accountId)) return null;
  const { data, error } = await supabase
    .from("accounts")
    .select("id, opening_date")
    .eq("id", accountId)
    .eq("household_id", householdId)
    .is("archived_at", null)
    .maybeSingle();
  // A failing query is a bug, not a missing account: surface it.
  if (error) throw error;
  return data ? { id: String(data.id), openingDate: String(data.opening_date) as ISODate } : null;
}

/** Account movements around the drafts' dates (all statuses: planned ones get booked later). */
export async function movementsAround(supabase: Client, accountId: string, drafts: ImportDraft[]): Promise<Movement[]> {
  const [from, to] = dateRange(drafts, POSSIBLE_WINDOW_DAYS);
  const rows = await allPages<Record<string, unknown>>((a, b) =>
    supabase.from("transactions").select("booked_on, amount_cents, description").eq("account_id", accountId).gte("booked_on", from).lte("booked_on", to).order("id").range(a, b),
  );
  return rows.map((r) => ({ bookedOn: String(r.booked_on), amountCents: Number(r.amount_cents), description: String(r.description) }));
}

/** Plain booked income/expense on the other visible accounts that could be the other side of a giroconto. */
export async function transferCandidates(supabase: Client, householdId: string, accountId: string, drafts: ImportDraft[]): Promise<TransferCandidate[]> {
  const [from, to] = dateRange(drafts, TRANSFER_WINDOW_DAYS);
  const amounts = new Set(drafts.map((d) => -d.amountCents));
  const [rows, { data: accounts, error }] = await Promise.all([
    allPages<Record<string, unknown>>((a, b) =>
      supabase
        .from("transactions")
        .select("id, account_id, booked_on, amount_cents, description, category_id")
        .eq("household_id", householdId)
        .neq("account_id", accountId)
        .in("kind", ["income", "expense"])
        .eq("status", "booked")
        .is("transfer_group_id", null)
        .is("parent_transaction_id", null)
        .gte("booked_on", from)
        .lte("booked_on", to)
        .order("id")
        .range(a, b),
    ),
    supabase.from("accounts").select("id, name").eq("household_id", householdId),
  ]);
  if (error) throw error;
  const names = new Map((accounts ?? []).map((a) => [String(a.id), String(a.name)]));
  return rows
    .filter((r) => amounts.has(Number(r.amount_cents)))
    .map((r) => ({
      id: String(r.id),
      accountId: String(r.account_id),
      accountName: names.get(String(r.account_id)) ?? "Altro conto",
      bookedOn: String(r.booked_on),
      amountCents: Number(r.amount_cents),
      description: String(r.description),
      categoryId: (r.category_id as string | null) ?? null,
    }));
}

/**
 * Turns the existing movement into the other side of each inserted transfer row. When it changed in the
 * meantime (already linked, deleted), the imported row falls back to a plain income/expense.
 * Returns how many giroconti were linked.
 */
export async function linkTransferSides(
  supabase: Client,
  inserted: { importRef: string; accountId: string; groupId: string; amountCents: number }[],
  candidateByRef: ReadonlyMap<string, string>,
): Promise<number> {
  let linked = 0;
  for (const row of inserted) {
    const otherId = candidateByRef.get(row.importRef);
    if (!otherId) continue;
    const { data } = await supabase
      .from("transactions")
      .update({ kind: "transfer", counterpart_account_id: row.accountId, transfer_group_id: row.groupId })
      .eq("id", otherId)
      .is("transfer_group_id", null)
      .select("id");
    if (data?.length) {
      linked++;
      continue;
    }
    await supabase
      .from("transactions")
      .update({ kind: row.amountCents > 0 ? "income" : "expense", counterpart_account_id: null, transfer_group_id: null })
      .eq("import_ref", row.importRef);
  }
  return linked;
}

/** Recent categorised income/expense of the household: the examples category suggestions learn from. */
export async function categorisedHistory(supabase: Client, householdId: string, limit = 3000): Promise<CategorisedMovement[]> {
  const rows = await allPages<Record<string, unknown>>((a, b) =>
    supabase
      .from("transactions")
      .select("description, amount_cents, category_id")
      .eq("household_id", householdId)
      .in("kind", ["income", "expense"])
      .not("category_id", "is", null)
      .order("booked_on", { ascending: false })
      .order("id")
      .range(a, b),
    limit,
  );
  return rows.map((r) => ({ description: String(r.description), amountCents: Number(r.amount_cents), categoryId: String(r.category_id) }));
}

/** Last 13 months of plain income/expense on the account, for recurring detection. */
export async function accountHistory(supabase: Client, accountId: string, today: ISODate): Promise<PastMovement[]> {
  const rows = await allPages<Record<string, unknown>>((a, b) =>
    supabase
      .from("transactions")
      .select("booked_on, amount_cents, description, category_id")
      .eq("account_id", accountId)
      .in("kind", ["income", "expense"])
      .eq("status", "booked")
      .gte("booked_on", addDays(today, -400))
      .order("id")
      .range(a, b),
  );
  return rows.map((r) => ({ bookedOn: String(r.booked_on), amountCents: Number(r.amount_cents), description: String(r.description), categoryId: (r.category_id as string | null) ?? null }));
}

/** Active rules of the account, so already planned commitments are not proposed again. */
export async function accountRules(supabase: Client, accountId: string): Promise<ExistingRule[]> {
  const { data, error } = await supabase.from("recurring_rules").select("amount_cents, frequency, description").eq("account_id", accountId).eq("active", true);
  if (error) throw error;
  return (data ?? []).map((r) => ({ amountCents: Number(r.amount_cents), frequency: r.frequency as RuleFrequency, description: String(r.description) }));
}
