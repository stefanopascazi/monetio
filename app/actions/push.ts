"use server";

import { getContext } from "@/lib/data/context";
import { parsePushSubscription } from "@/lib/push/subscription";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, dbErrorMessage, failure, success } from "./state";

/** Saves this browser's push subscription for the signed-in user. */
export async function savePushSubscription(subscription: unknown, userAgent: string): Promise<ActionState> {
  await getContext();
  const parsed = parsePushSubscription(subscription);
  if (!parsed) return failure("Iscrizione alle notifiche non valida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("register_push_subscription", {
    p_endpoint: parsed.endpoint,
    p_p256dh: parsed.p256dh,
    p_auth: parsed.auth,
    p_user_agent: String(userAgent).slice(0, 300),
  });
  if (error) return failure(dbErrorMessage(error));
  return success("Notifiche attivate su questo dispositivo.");
}

/** Removes this browser's subscription (RLS limits it to the caller's own rows). */
export async function removePushSubscription(endpoint: string): Promise<ActionState> {
  await getContext();
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) return failure("Dispositivo non trovato.");
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) return failure(dbErrorMessage(error));
  return success("Notifiche disattivate su questo dispositivo.");
}

/** Queues a test notification; the VPS worker delivers it within about a minute. */
export async function sendTestNotification(): Promise<ActionState> {
  await getContext();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("queue_test_notification");
  if (error) return failure(dbErrorMessage(error));
  if (!data) return failure("Attendi un minuto prima di inviare un'altra prova, o riattiva le notifiche.");
  return success("Notifica di prova in arrivo entro un minuto.");
}
