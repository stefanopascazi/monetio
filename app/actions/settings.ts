"use server";

import { refresh } from "next/cache";
import { getContext } from "@/lib/data/context";
import { isUUID } from "@/lib/forms/parse";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, dbErrorMessage, failure, success } from "./state";

const KINDS = ["income", "expense", "both"];

export async function createCategory(prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await getContext();
  const name = String(fd.get("name") ?? "").trim();
  const kind = String(fd.get("kind") ?? "expense");
  const icon = String(fd.get("icon") ?? "") || null;
  const color = Number(fd.get("colorIndex") ?? 1);
  if (!name || name.length > 40) return failure("Scrivi un nome per la categoria.", { name: "Nome obbligatorio" });
  if (!KINDS.includes(kind) || !(color >= 1 && color <= 6)) return failure("Valori non validi.");
  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({ household_id: ctx.householdId, name, kind, icon, color_index: color });
  if (error) return failure(error.code === "23505" ? "Esiste già una categoria con questo nome." : dbErrorMessage(error));
  refresh();
  return success("Categoria aggiunta.", prev);
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

export async function updateProfile(prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await getContext();
  const displayName = String(fd.get("displayName") ?? "").trim();
  const householdName = String(fd.get("householdName") ?? "").trim();
  if (!displayName || !householdName) return failure("Nome e nucleo sono obbligatori.");
  const supabase = await createClient();
  const [a, b] = await Promise.all([
    supabase.from("household_members").update({ display_name: displayName }).eq("id", ctx.me.id),
    supabase.from("households").update({ name: householdName }).eq("id", ctx.householdId),
  ]);
  if (a.error || b.error) return failure(dbErrorMessage(a.error ?? b.error));
  refresh();
  return success("Profilo aggiornato.", prev);
}
