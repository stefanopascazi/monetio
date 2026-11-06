import type { SupabaseClient } from "@supabase/supabase-js";
import { feeCategoryId } from "../domain/fees";

/** Default category id for fee rows of a household ("Commissioni ..."), null when missing. */
export async function fetchFeeCategoryId(client: SupabaseClient, householdId: string): Promise<string | null> {
  const { data } = await client.from("categories").select("id, name, kind").eq("household_id", householdId).is("archived_at", null).order("name");
  return feeCategoryId((data ?? []).map((c) => ({ id: String(c.id), name: String(c.name), kind: c.kind })));
}
