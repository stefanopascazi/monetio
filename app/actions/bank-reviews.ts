"use server";

import { refresh } from "next/cache";
import { isReviewAction, REVIEW_DONE_MESSAGE } from "@/lib/banking/reviews";
import { getContext } from "@/lib/data/context";
import { isUUID } from "@/lib/forms/parse";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, dbErrorMessage, failure, success } from "./state";

/** Settles a "Da rivedere" item: add it, merge it into the candidate, or ignore it. */
export async function resolveBankReview(reviewId: string, action: string): Promise<ActionState> {
  if (!isUUID(reviewId) || !isReviewAction(action)) return failure("Valori non validi.");
  await getContext();
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_bank_review", { p_review: reviewId, p_action: action });
  if (error) {
    if (error.code === "P0002") return failure("Movimento già risolto o non più disponibile.");
    return failure(dbErrorMessage(error));
  }
  refresh();
  return success(REVIEW_DONE_MESSAGE[action]);
}
