// Category matches of an account (#91): read, remember a choice and apply it to identical movements.
import "server-only";
import type { createClient } from "../supabase/server";
import { type CategoryMatch, directionOf, matchKey, propagationTargets, type Direction } from "../import/matches";

type Client = Awaited<ReturnType<typeof createClient>>;

export interface StoredMatch extends CategoryMatch {
  id: string;
  sampleDescription: string;
}

const CHUNK = 500;
const PAGE = 1000;

export function mapMatch(r: Record<string, unknown>): StoredMatch {
  return {
    id: String(r.id),
    key: String(r.description_key),
    direction: Number(r.direction) as Direction,
    categoryId: String(r.category_id),
    sampleDescription: String(r.sample_description),
  };
}

export async function listAccountMatches(supabase: Client, accountId: string): Promise<StoredMatch[]> {
  const { data, error } = await supabase
    .from("account_category_matches")
    .select("id, description_key, direction, category_id, sample_description")
    .eq("account_id", accountId)
    .order("sample_description");
  if (error) throw error;
  return (data ?? []).map(mapMatch);
}

export interface CategoryChoice {
  householdId: string;
  accountId: string;
  description: string;
  amountCents: number;
  categoryId: string;
}

/** Plain income/expense of the account in one direction that are uncategorised or on `replacing`. */
async function candidates(supabase: Client, accountId: string, direction: Direction, replacing: string | null) {
  const out: { id: string; description: string; amountCents: number; categoryId: string | null }[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from("transactions")
      .select("id, description, amount_cents, category_id")
      .eq("account_id", accountId)
      .in("kind", ["income", "expense"])
      .is("parent_transaction_id", null);
    q = direction > 0 ? q.gt("amount_cents", 0) : q.lte("amount_cents", 0);
    q = replacing ? q.or(`category_id.is.null,category_id.eq.${replacing}`) : q.is("category_id", null);
    const { data, error } = await q.order("id").range(from, from + PAGE - 1);
    if (error) throw error;
    for (const r of data ?? []) out.push({ id: String(r.id), description: String(r.description), amountCents: Number(r.amount_cents), categoryId: (r.category_id as string | null) ?? null });
    if (!data || data.length < PAGE) return out;
  }
}

/**
 * Remembers "this description, in this account, goes to this category" and applies it to identical
 * movements without category, or still on the category the previous match gave them.
 * Returns how many movements changed; null when the description has nothing to match on.
 */
export async function applyCategoryChoice(supabase: Client, c: CategoryChoice): Promise<number | null> {
  const key = matchKey(c.description);
  if (!key) return null;
  const direction = directionOf(c.amountCents);
  const { data: existing, error: readError } = await supabase
    .from("account_category_matches")
    .select("category_id")
    .eq("account_id", c.accountId)
    .eq("description_key", key)
    .eq("direction", direction)
    .maybeSingle();
  if (readError) throw readError;
  const replacing = existing && existing.category_id !== c.categoryId ? String(existing.category_id) : null;

  const { error } = await supabase.from("account_category_matches").upsert(
    {
      household_id: c.householdId,
      account_id: c.accountId,
      description_key: key,
      direction,
      category_id: c.categoryId,
      sample_description: c.description,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id,description_key,direction" },
  );
  if (error) throw error;

  const ids = propagationTargets(await candidates(supabase, c.accountId, direction, replacing), c, replacing).map((m) => m.id);
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { error: updateError } = await supabase.from("transactions").update({ category_id: c.categoryId }).in("id", ids.slice(i, i + CHUNK));
    if (updateError) throw updateError;
  }
  return ids.length;
}

/** Whether a manual recategorisation should update the match: the movement had no category or the matched one. */
export async function followsMatch(supabase: Client, accountId: string, description: string, amountCents: number, previousCategoryId: string | null): Promise<boolean> {
  if (!previousCategoryId) return true;
  const key = matchKey(description);
  if (!key) return false;
  const { data, error } = await supabase
    .from("account_category_matches")
    .select("category_id")
    .eq("account_id", accountId)
    .eq("description_key", key)
    .eq("direction", directionOf(amountCents))
    .maybeSingle();
  if (error) throw error;
  return data?.category_id === previousCategoryId;
}

export async function removeAccountMatch(supabase: Client, id: string) {
  const { error } = await supabase.from("account_category_matches").delete().eq("id", id);
  if (error) throw error;
}

/** Booked income/expense of the account without category, for the "Da categorizzare" tab. */
export async function listUncategorised(supabase: Client, accountId: string, limit = 5000) {
  const out: { description: string; amountCents: number; bookedOn: string }[] = [];
  for (let from = 0; from < limit; from += PAGE) {
    const { data, error } = await supabase
      .from("transactions")
      .select("description, amount_cents, booked_on")
      .eq("account_id", accountId)
      .eq("status", "booked")
      .in("kind", ["income", "expense"])
      .is("category_id", null)
      .is("parent_transaction_id", null)
      .order("booked_on", { ascending: false })
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    for (const r of data ?? []) out.push({ description: String(r.description), amountCents: Number(r.amount_cents), bookedOn: String(r.booked_on) });
    if (!data || data.length < PAGE) break;
  }
  return out;
}
