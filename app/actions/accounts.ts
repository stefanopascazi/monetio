"use server";

import { refresh } from "next/cache";
import { getContext } from "@/lib/data/context";
import { parseAccountForm } from "@/lib/forms/account";
import { isUUID } from "@/lib/forms/parse";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, dbErrorMessage, failure, success } from "./state";

export async function createAccount(prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await getContext();
  const parsed = parseAccountForm(fd);
  if (!parsed.ok) return failure("Controlla i campi evidenziati.", parsed.errors);
  const v = parsed.value;
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").insert({
    household_id: ctx.householdId,
    name: v.name,
    institution: v.institution,
    type: v.type,
    visibility: v.visibility,
    // Private accounts belong to whoever creates them.
    owner_member_id: ctx.me.id,
    opening_balance_cents: v.openingBalanceCents,
    opening_date: v.openingDate,
  });
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success("Conto creato.", prev);
}

export async function updateAccount(id: string, prev: ActionState, fd: FormData): Promise<ActionState> {
  if (!isUUID(id)) return failure("Conto non trovato.");
  const ctx = await getContext();
  const parsed = parseAccountForm(fd);
  if (!parsed.ok) return failure("Controlla i campi evidenziati.", parsed.errors);
  const v = parsed.value;
  const supabase = await createClient();
  const { data: current } = await supabase.from("accounts").select("owner_member_id").eq("id", id).maybeSingle();
  if (!current) return failure("Conto non trovato.");
  if (v.visibility === "private" && current.owner_member_id && current.owner_member_id !== ctx.me.id) {
    return failure("Solo il titolare può rendere privato questo conto.");
  }
  const { error } = await supabase
    .from("accounts")
    .update({
      name: v.name,
      institution: v.institution,
      type: v.type,
      visibility: v.visibility,
      owner_member_id: current.owner_member_id ?? ctx.me.id,
      opening_balance_cents: v.openingBalanceCents,
      opening_date: v.openingDate,
    })
    .eq("id", id);
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success("Conto aggiornato.", prev);
}

export async function setAccountArchived(id: string, archived: boolean): Promise<ActionState> {
  if (!isUUID(id)) return failure("Conto non trovato.");
  await getContext();
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").update({ archived_at: archived ? new Date().toISOString() : null }).eq("id", id);
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success(archived ? "Conto archiviato." : "Conto ripristinato.");
}
