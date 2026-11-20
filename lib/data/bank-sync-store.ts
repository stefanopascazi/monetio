import "server-only";
import type { CategoryHints } from "../banking/sync/categories";
import type { SyncStore } from "../banking/sync/run";
import type { ISODate } from "../domain/types";
import { createClient } from "../supabase/server";
import { listAccountMatches } from "./category-matches";
import { mapCategory } from "./mappers";

type Client = Awaited<ReturnType<typeof createClient>>;

/** PostgREST caps each response (1000 rows on Supabase): read in pages up to `limit`. */
async function readPages<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>, limit = 20_000): Promise<T[]> {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; from < limit; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < size) break;
  }
  return out;
}

/** Read side of the sync, as the signed-in person (RLS): what the preview needs to decide. */
export function createPreviewSyncStore(supabase: Client): Pick<SyncStore, "loadExisting" | "loadCategoryHints"> {
  return {
    async loadExisting(accountId: string, from: ISODate) {
      const [txns, reviews] = await Promise.all([
        readPages((a, b) =>
          supabase
            .from("transactions")
            .select("id, booked_on, amount_cents, description, bank_ref, recurring_rule_id, contribution_rule_id")
            .eq("account_id", accountId)
            .eq("status", "booked")
            .gte("booked_on", from)
            .is("parent_transaction_id", null)
            .order("id")
            .range(a, b),
        ),
        readPages((a, b) => supabase.from("bank_sync_reviews").select("bank_ref").eq("account_id", accountId).order("id").range(a, b)),
      ]);
      return {
        candidates: txns.map((t) => ({
          id: t.id,
          bookedOn: t.booked_on as ISODate,
          amountCents: Number(t.amount_cents),
          description: t.description,
          fromRule: t.recurring_rule_id != null || t.contribution_rule_id != null,
          bankRef: t.bank_ref,
        })),
        reviewRefs: reviews.map((r) => r.bank_ref),
      };
    },

    async loadCategoryHints(target): Promise<CategoryHints> {
      const [matches, categories] = await Promise.all([
        listAccountMatches(supabase, target.accountId),
        supabase.from("categories").select("*").eq("household_id", target.householdId),
      ]);
      if (categories.error) throw categories.error;
      return { matches, categories: (categories.data ?? []).map(mapCategory) };
    },
  };
}
