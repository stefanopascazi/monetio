import "server-only";
import { cache } from "react";
import { type BankReview, mapBankReview } from "../banking/reviews";
import { createClient } from "../supabase/server";
import { getContext } from "./context";

/** Open "Da rivedere" items of the active household's visible accounts (RLS), oldest first. */
export const listOpenBankReviews = cache(async (): Promise<BankReview[]> => {
  const { householdId } = await getContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bank_sync_reviews")
    .select(
      "id, account_id, booked_on, amount_cents, description, reason, account:accounts(name), candidate:transactions!bank_sync_reviews_candidate_transaction_id_fkey(id, booked_on, amount_cents, description)",
    )
    .eq("household_id", householdId)
    .is("resolved_at", null)
    .order("booked_on", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => mapBankReview(r as unknown as Parameters<typeof mapBankReview>[0]));
});
