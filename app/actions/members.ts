"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import { getContext } from "@/lib/data/context";
import { parseInviteForm } from "@/lib/forms/invite";
import { createAdminClient } from "@/lib/supabase/admin";
import { type ActionState, failure, success } from "./state";

/**
 * Invites a person by email (owners only): links the email to a pending member or creates one,
 * then Supabase sends the invite. On first login the account is linked by email (claim_membership).
 */
export async function inviteMember(prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await getContext();
  if (ctx.me.role !== "owner") return failure("Solo chi gestisce il nucleo può invitare persone.");
  const parsed = parseInviteForm(fd);
  if (!parsed.ok) return failure("Controlla i campi evidenziati.", parsed.errors);
  const { email, memberId, displayName } = parsed.value;

  if (ctx.members.some((m) => m.email?.toLowerCase() === email && m.userId)) return failure("Questa persona ha già un account nel nucleo.");
  const admin = createAdminClient();

  if (memberId) {
    const target = ctx.members.find((m) => m.id === memberId);
    if (!target || target.userId) return failure("Persona non trovata o già attiva.");
    const { error } = await admin.from("household_members").update({ email }).eq("id", memberId).eq("household_id", ctx.householdId);
    if (error) return failure("Non è stato possibile salvare l'email.");
  } else if (!ctx.members.some((m) => m.email?.toLowerCase() === email)) {
    const { error } = await admin.from("household_members").insert({ household_id: ctx.householdId, display_name: displayName, email, role: "member" });
    if (error) return failure("Non è stato possibile aggiungere la persona.");
  }

  const origin = (await headers()).get("origin") ?? "";
  const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${origin}/auth/password` });
  if (error) {
    return failure(/already been registered/i.test(error.message) ? "Esiste già un account con questa email: potrà accedere direttamente." : "Invito non inviato. Riprova più tardi.");
  }
  refresh();
  return success(`Invito inviato a ${email}.`, prev);
}
