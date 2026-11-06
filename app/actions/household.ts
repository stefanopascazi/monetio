"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { writeActiveHouseholdId } from "@/lib/data/active-household";
import { getContext, listMemberships } from "@/lib/data/context";
import { householdErrorMessage, isAdmin } from "@/lib/domain/household";
import { isUUID } from "@/lib/forms/parse";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, dbErrorMessage, failure, success } from "./state";

/** Creates a household with the caller as admin and switches to it. */
export async function createHousehold(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const name = String(fd.get("householdName") ?? "").trim();
  const displayName = String(fd.get("displayName") ?? "").trim();
  if (!name || !displayName) return failure("Inserisci il nome del nucleo e il tuo nome.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_household", { p_name: name, p_display_name: displayName });
  if (error) return failure("Non è stato possibile creare il nucleo.");
  await writeActiveHouseholdId(String(data));
  redirect("/");
}

export interface InviteLookup extends ActionState {
  code?: string;
  members?: { id: string; displayName: string }[];
}

/** First step of joining: checks the code and lists members waiting for an account. */
export async function lookupInvite(_prev: InviteLookup, fd: FormData): Promise<InviteLookup> {
  const code = String(fd.get("code") ?? "").trim().toUpperCase();
  if (!code) return failure("Inserisci il codice invito.");
  const supabase = await createClient();
  const { data: members, error } = await supabase.rpc("unclaimed_members", { p_code: code });
  if (error) return failure("Codice non valido.");
  return { ok: true, code, members: (members ?? []).map((m: { id: string; display_name: string }) => ({ id: m.id, displayName: m.display_name })) };
}

/** Joins by invite code as a plain member and switches to that household. */
export async function joinHousehold(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const code = String(fd.get("code") ?? "").trim();
  const memberId = String(fd.get("memberId") ?? "") || null;
  const displayName = String(fd.get("displayName") ?? "").trim();
  if (!code || (!memberId && !displayName)) return failure("Scegli chi sei oppure scrivi il tuo nome.");
  const supabase = await createClient();
  const { data: mid, error } = await supabase.rpc("join_household", { p_code: code, p_display_name: displayName || "Membro", p_member_id: memberId });
  if (error) return failure(householdErrorMessage(error) ?? "Non è stato possibile unirti al nucleo.");
  const { data: row } = await supabase.from("household_members").select("household_id").eq("id", mid).maybeSingle();
  if (row) await writeActiveHouseholdId(String(row.household_id));
  redirect("/");
}

/** Makes another household of the user the active one. */
export async function switchHousehold(householdId: string): Promise<ActionState> {
  if (!isUUID(householdId)) return failure("Nucleo non trovato.");
  const rows = await listMemberships();
  if (!rows.some((r) => r.household_id === householdId)) return failure("Non fai parte di questo nucleo.");
  await writeActiveHouseholdId(householdId);
  redirect("/");
}

/** Admins only: renames the active household. */
export async function renameHousehold(prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await getContext();
  if (!isAdmin(ctx.me)) return failure("Solo un amministratore può rinominare il nucleo.");
  const name = String(fd.get("householdName") ?? "").trim();
  if (!name || name.length > 60) return failure("Scrivi il nome del nucleo.", { householdName: "Nome obbligatorio" });
  const supabase = await createClient();
  const { error } = await supabase.from("households").update({ name }).eq("id", ctx.householdId);
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success("Nucleo rinominato.", prev);
}

/** Admins only: deletes the active household with all its data, then moves to another one. */
export async function deleteHousehold(): Promise<ActionState> {
  const ctx = await getContext();
  if (!isAdmin(ctx.me)) return failure("Solo un amministratore può eliminare il nucleo.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_household", { p_household: ctx.householdId });
  if (error) return failure(householdErrorMessage(error) ?? dbErrorMessage(error));
  await writeActiveHouseholdId(null);
  redirect("/");
}

/** Removes the caller from the active household (blocked for the last admin). */
export async function leaveHousehold(): Promise<ActionState> {
  const ctx = await getContext();
  const supabase = await createClient();
  const { data, error } = await supabase.from("household_members").delete().eq("id", ctx.me.id).select("id");
  if (error || !data?.length) return failure(householdErrorMessage(error) ?? dbErrorMessage(error));
  await writeActiveHouseholdId(null);
  redirect("/");
}
