"use server";

import { refresh } from "next/cache";
import { getUser } from "@/lib/data/context";
import { isUUID } from "@/lib/forms/parse";
import { parsePrefsForm } from "@/lib/forms/notification-prefs";
import { prefsToRow } from "@/lib/notifications/prefs";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, dbErrorMessage, failure, success } from "./state";

/** Marks one notification read (RLS: own rows, read_at only). */
export async function markNotificationRead(id: string): Promise<ActionState> {
  if (!isUUID(id)) return failure("Notifica non trovata.");
  await getUser();
  const supabase = await createClient();
  const { error } = await supabase.from("push_outbox").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<ActionState> {
  await getUser();
  const supabase = await createClient();
  const { error } = await supabase.from("push_outbox").update({ read_at: new Date().toISOString() }).is("read_at", null);
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success("Tutte le notifiche sono segnate come lette.");
}

export async function saveNotificationPrefs(prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getUser();
  const parsed = parsePrefsForm(fd);
  if (!parsed.ok) return failure("Controlla i campi evidenziati.", parsed.errors);
  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_prefs")
    .upsert({ user_id: user.id, ...prefsToRow(parsed.value), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success("Preferenze salvate.", prev);
}
