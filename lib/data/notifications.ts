import "server-only";
import { cache } from "react";
import { mapInboxItem, type InboxItem } from "../notifications/inbox";
import { DEFAULT_PREFS, mapPrefs, type NotificationPrefs } from "../notifications/prefs";
import { createClient } from "../supabase/server";
import { getUser } from "./context";

/** Notifications kept 30 days by the worker: one page is enough. */
const INBOX_LIMIT = 200;

export const countUnreadNotifications = cache(async (): Promise<number> => {
  await getUser();
  const supabase = await createClient();
  const { count, error } = await supabase.from("push_outbox").select("id", { count: "exact", head: true }).is("read_at", null);
  if (error) throw error;
  return count ?? 0;
});

export const listNotifications = cache(async (): Promise<InboxItem[]> => {
  await getUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("push_outbox").select("id, title, body, url, created_at, read_at").order("created_at", { ascending: false }).limit(INBOX_LIMIT);
  if (error) throw error;
  return (data ?? []).map(mapInboxItem);
});

export const getNotificationPrefs = cache(async (): Promise<NotificationPrefs> => {
  const user = await getUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("notification_prefs").select("*").eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  return data ? mapPrefs(data) : DEFAULT_PREFS;
});
