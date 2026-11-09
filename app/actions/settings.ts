"use server";

import { refresh } from "next/cache";
import { getContext } from "@/lib/data/context";
import { type CategoryInput, parseCategoryForm } from "@/lib/forms/category";
import { isUUID } from "@/lib/forms/parse";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, dbErrorMessage, failure, success } from "./state";

const toRow = ({ name, kind, icon, colorIndex }: CategoryInput) => ({ name, kind, icon, color_index: colorIndex });
const INVALID = "Controlla i campi evidenziati.";
const DUPLICATE_NAME = "Esiste già una categoria con questo nome.";

export async function createCategory(prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await getContext();
  const parsed = parseCategoryForm(fd);
  if (!parsed.ok) return failure(INVALID, parsed.errors);
  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({ household_id: ctx.householdId, ...toRow(parsed.value) });
  if (error) return failure(error.code === "23505" ? DUPLICATE_NAME : dbErrorMessage(error));
  refresh();
  return success("Categoria aggiunta.", prev);
}

export async function updateCategory(id: string, prev: ActionState, fd: FormData): Promise<ActionState> {
  if (!isUUID(id)) return failure("Categoria non trovata.");
  await getContext();
  const parsed = parseCategoryForm(fd);
  if (!parsed.ok) return failure(INVALID, parsed.errors);
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").update(toRow(parsed.value)).eq("id", id).select("id");
  if (error) return failure(error.code === "23505" ? DUPLICATE_NAME : dbErrorMessage(error));
  if (!data?.length) return failure("Categoria non trovata.");
  refresh();
  return success("Categoria aggiornata.", prev);
}

export async function archiveCategory(id: string): Promise<ActionState> {
  if (!isUUID(id)) return failure("Categoria non trovata.");
  await getContext();
  const supabase = await createClient();
  const { error } = await supabase.from("categories").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success("Categoria archiviata.");
}

/** Own display name in the active household (household name is renamed by admins). */
export async function updateProfile(prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await getContext();
  const displayName = String(fd.get("displayName") ?? "").trim();
  if (!displayName || displayName.length > 40) return failure("Scrivi il tuo nome.", { displayName: "Nome obbligatorio" });
  const supabase = await createClient();
  const { error } = await supabase.from("household_members").update({ display_name: displayName }).eq("id", ctx.me.id);
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success("Profilo aggiornato.", prev);
}
