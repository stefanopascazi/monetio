"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import { getContext } from "@/lib/data/context";
import { householdErrorMessage, isAdmin, isLastAdmin, isMemberRole } from "@/lib/domain/household";
import { parseInviteForm } from "@/lib/forms/invite";
import { isUUID } from "@/lib/forms/parse";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, dbErrorMessage, failure, success } from "./state";

/**
 * Invites a person by email (admins only) with the chosen role: links the email to a pending member
 * or creates one, then Supabase sends the invite. Accounts are linked by email on the next request
 * (claim_membership), so people who already have an account just find the new household.
 */
export async function inviteMember(prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await getContext();
  if (!isAdmin(ctx.me)) return failure("Solo un amministratore può invitare persone.");
  const parsed = parseInviteForm(fd);
  if (!parsed.ok) return failure("Controlla i campi evidenziati.", parsed.errors);
  const { email, memberId, displayName, role } = parsed.value;

  if (ctx.members.some((m) => m.email?.toLowerCase() === email && m.userId)) return failure("Questa persona ha già un account nel nucleo.");
  const admin = createAdminClient();

  if (memberId) {
    const target = ctx.members.find((m) => m.id === memberId);
    if (!target || target.userId) return failure("Persona non trovata o già attiva.");
    const { error } = await admin.from("household_members").update({ email, role }).eq("id", memberId).eq("household_id", ctx.householdId);
    if (error) return failure("Non è stato possibile salvare l'email.");
  } else if (!ctx.members.some((m) => m.email?.toLowerCase() === email)) {
    const { error } = await admin.from("household_members").insert({ household_id: ctx.householdId, display_name: displayName, email, role });
    if (error) return failure("Non è stato possibile aggiungere la persona.");
  }

  const origin = (await headers()).get("origin") ?? "";
  const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${origin}/auth/password` });
  refresh();
  if (error) {
    return /already been registered/i.test(error.message)
      ? success(`${email} ha già un account: troverà il nucleo al prossimo accesso.`, prev)
      : failure("Invito non inviato. Riprova più tardi.");
  }
  return success(`Invito inviato a ${email}.`, prev);
}

/** Admins only: makes a member an admin or a plain member (the last active admin cannot step down). */
export async function setMemberRole(memberId: string, role: string): Promise<ActionState> {
  if (!isUUID(memberId) || !isMemberRole(role)) return failure("Valori non validi.");
  const ctx = await getContext();
  if (!isAdmin(ctx.me)) return failure("Solo un amministratore può cambiare i ruoli.");
  const target = ctx.members.find((m) => m.id === memberId);
  if (!target) return failure("Persona non trovata.");
  if (target.role === role) return success("Ruolo invariato.");
  if (role === "member" && isLastAdmin(ctx.members, memberId)) return failure("Il nucleo deve avere almeno un amministratore attivo.");
  const supabase = await createClient();
  const { error } = await supabase.from("household_members").update({ role }).eq("id", memberId).eq("household_id", ctx.householdId);
  if (error) return failure(householdErrorMessage(error) ?? dbErrorMessage(error));
  refresh();
  return success(role === "admin" ? `${target.displayName} ora è amministratore.` : `${target.displayName} ora è membro.`);
}

/** Admins only: removes another member from the household (use leaveHousehold for yourself). */
export async function removeMember(memberId: string): Promise<ActionState> {
  if (!isUUID(memberId)) return failure("Persona non trovata.");
  const ctx = await getContext();
  if (!isAdmin(ctx.me)) return failure("Solo un amministratore può rimuovere persone.");
  if (memberId === ctx.me.id) return failure("Per uscire dal nucleo usa \"Esci dal nucleo\".");
  const target = ctx.members.find((m) => m.id === memberId);
  if (!target) return failure("Persona non trovata.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("household_members").delete().eq("id", memberId).eq("household_id", ctx.householdId).select("id");
  if (error || !data?.length) return failure(householdErrorMessage(error) ?? dbErrorMessage(error));
  refresh();
  return success(`${target.displayName} rimosso dal nucleo.`);
}
