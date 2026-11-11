import "server-only";
import { type ImportBatch, mapBatch } from "../import/batch";
import { createClient } from "../supabase/server";
import { activeHouseholdId } from "./context";

/** Imports of the household on accounts the viewer can see, newest first. */
export async function listImportBatches(limit = 100): Promise<ImportBatch[]> {
  const [supabase, hh] = await Promise.all([createClient(), activeHouseholdId()]);
  const { data, error } = await supabase.from("import_batches").select("*").eq("household_id", hh).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapBatch);
}
