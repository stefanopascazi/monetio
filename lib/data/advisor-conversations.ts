import "server-only";
import type { AdvisorContext } from "../advisor/context";
import { type AdvisorTurnView, type StoredTurn, turnViews } from "../advisor/turns";
import { getContext } from "./context";
import { listAccounts, listCategories } from "./queries";
import { createClient } from "../supabase/server";

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

/** The current user's conversations, most recent first. */
export async function listConversations(limit = 30): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("advisor_conversations").select("id, title, updated_at").order("updated_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []).map((c) => ({ id: String(c.id), title: String(c.title), updatedAt: String(c.updated_at) }));
}

/** Rows of one conversation (RLS: only the author's), oldest first. */
export async function loadConversationRows(id: string): Promise<{ title: string; rows: (StoredTurn & { turn: number })[] } | null> {
  const supabase = await createClient();
  const [{ data: conv, error: e1 }, { data: rows, error: e2 }] = await Promise.all([
    supabase.from("advisor_conversations").select("title").eq("id", id).maybeSingle(),
    supabase.from("advisor_requests").select("id, turn, question, answer, verdict, refused, payment_plan, rating").eq("conversation_id", id).order("turn"),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  if (!conv) return null;
  return { title: String(conv.title), rows: (rows ?? []) as (StoredTurn & { turn: number })[] };
}

/** Account and category names, to render stored verdicts. */
async function verdictNames(): Promise<Pick<AdvisorContext, "accounts" | "categories">> {
  const [accounts, categories] = await Promise.all([listAccounts(), listCategories()]);
  return {
    accounts: accounts.map((a) => ({ id: a.id, name: a.name, type: a.type })),
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
  };
}

/** A conversation as the chat shows it. */
export async function loadConversation(id: string): Promise<{ id: string; title: string; turns: AdvisorTurnView[] } | null> {
  const [conv, names] = await Promise.all([loadConversationRows(id), verdictNames()]);
  return conv ? { id, title: conv.title, turns: turnViews(conv.rows, names) } : null;
}

export async function createConversation(title: string): Promise<string> {
  const [ctx, supabase] = await Promise.all([getContext(), createClient()]);
  const { data, error } = await supabase.from("advisor_conversations").insert({ household_id: ctx.householdId, user_id: ctx.userId, title }).select("id").single();
  if (error) throw error;
  return String(data.id);
}

/** Moves a conversation to the top of the list (and restarts its 30 days). */
export async function touchConversation(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("advisor_conversations").update({ updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

/** Deletes one conversation, or all of the user's when id is null: texts go, metrics stay. */
export async function deleteConversations(id: string | null): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_advisor_conversations", { conversation: id });
  if (error) throw error;
  return Number(data ?? 0);
}
