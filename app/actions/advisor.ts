"use server";

import type { AdvisorQuota } from "@/lib/advisor/quota";
import type { AdvisorTurnView } from "@/lib/advisor/turns";
import { advisorEnabled, loadAdvisorQuota, rateAdvisorRequest } from "@/lib/data/advisor";
import { type ConversationSummary, deleteConversations, listConversations, loadConversation } from "@/lib/data/advisor-conversations";
import { isUUID } from "@/lib/forms/parse";

export async function rateAdvisorAnswer(id: string, rating: 1 | -1): Promise<{ ok: boolean }> {
  if (!isUUID(id) || (rating !== 1 && rating !== -1)) return { ok: false };
  return { ok: await rateAdvisorRequest(id, rating) };
}

/** Questions left for the counter; null when the assistant is off. */
export async function getAdvisorQuota(): Promise<AdvisorQuota | null> {
  return advisorEnabled() ? loadAdvisorQuota() : null;
}

export async function listAdvisorConversations(): Promise<ConversationSummary[]> {
  return listConversations();
}

export async function openAdvisorConversation(id: string): Promise<{ id: string; title: string; turns: AdvisorTurnView[] } | null> {
  return isUUID(id) ? loadConversation(id) : null;
}

/** Deletes one conversation, or every conversation of the user when id is null. */
export async function deleteAdvisorConversation(id: string | null): Promise<{ ok: boolean }> {
  if (id !== null && !isUUID(id)) return { ok: false };
  await deleteConversations(id);
  return { ok: true };
}
