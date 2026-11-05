"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, failure } from "./state";

export async function createHousehold(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const name = String(fd.get("householdName") ?? "").trim();
  const displayName = String(fd.get("displayName") ?? "").trim();
  if (!name || !displayName) return failure("Inserisci il nome del nucleo e il tuo nome.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_household", { p_name: name, p_display_name: displayName });
  if (error) return failure("Non è stato possibile creare il nucleo.");
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

export async function joinHousehold(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const code = String(fd.get("code") ?? "").trim();
  const memberId = String(fd.get("memberId") ?? "") || null;
  const displayName = String(fd.get("displayName") ?? "").trim();
  if (!code || (!memberId && !displayName)) return failure("Scegli chi sei oppure scrivi il tuo nome.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_household", { p_code: code, p_display_name: displayName || "Membro", p_member_id: memberId });
  if (error) return failure(/invalid invite/i.test(error.message) ? "Codice invito non valido." : "Non è stato possibile unirti al nucleo.");
  redirect("/");
}
