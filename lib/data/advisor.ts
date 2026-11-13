import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AdvisorContext } from "../advisor/context";
import type { AdvisorClient, AdvisorRun } from "../advisor/run";
import { loadProjectionInput } from "./agenda";
import { getContext } from "./context";
import { listCategories } from "./queries";
import { loadReliability } from "./reliability";
import { createClient } from "../supabase/server";

/** The advisor is an experiment: on only where the server has an API key. */
export function advisorEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** SDK client; reads ANTHROPIC_API_KEY from the environment. */
export function advisorClient(): AdvisorClient {
  return new Anthropic();
}

export function advisorModel(): string | undefined {
  return process.env.ADVISOR_MODEL || undefined;
}

/** What the advisor sees: the viewer's visible accounts only (RLS), no IBANs, notes or movement descriptions. */
export async function loadAdvisorContext(): Promise<AdvisorContext> {
  const [{ active, input }, categories, reliability] = await Promise.all([loadProjectionInput(1), listCategories(), loadReliability()]);
  return {
    input,
    accounts: active.map((a) => ({ id: a.id, name: a.name, type: a.type })),
    categories: categories.filter((c) => !c.archived && c.kind !== "income").map((c) => ({ id: c.id, name: c.name })),
    reliability: { score: reliability.score, level: reliability.level },
    bands: reliability.bands,
  };
}

/** Questions per user per day: a cost guard while the experiment runs. */
export function advisorDailyLimit(): number {
  return Number(process.env.ADVISOR_DAILY_LIMIT) || 20;
}

/** Questions asked by the current user in the last 24 hours. */
export async function countRecentRequests(): Promise<number> {
  const [ctx, supabase] = await Promise.all([getContext(), createClient()]);
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count, error } = await supabase
    .from("advisor_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.userId)
    .gte("created_at", since);
  if (error) throw error;
  return count ?? 0;
}

/** Saves the author's feedback on an answer. */
export async function rateAdvisorRequest(id: string, rating: 1 | -1): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("advisor_requests")
    .update({ rating, rated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) throw error;
  return (data ?? []).length === 1;
}

export interface AdvisorLogEntry {
  question: string;
  run: AdvisorRun | null;
  model: string;
  durationMs: number;
  error?: string;
}

/** Stores one question with its cost and outcome; returns the row id for the rating, null when logging failed. */
export async function logAdvisorRequest(e: AdvisorLogEntry): Promise<string | null> {
  const [ctx, supabase] = await Promise.all([getContext(), createClient()]);
  const { data, error } = await supabase
    .from("advisor_requests")
    .insert({
      household_id: ctx.householdId,
      user_id: ctx.userId,
      question: e.question,
      answer: e.run?.text ?? null,
      verdict: e.run?.verdict ?? null,
      refused: e.run?.refused ?? false,
      payment_plan: e.run?.paymentPlan ?? false,
      model: e.run?.model ?? e.model,
      stop_reason: e.run?.stopReason ?? null,
      error: e.error ?? null,
      input_tokens: e.run?.usage.inputTokens ?? 0,
      output_tokens: e.run?.usage.outputTokens ?? 0,
      cache_read_tokens: e.run?.usage.cacheReadTokens ?? 0,
      cache_write_tokens: e.run?.usage.cacheWriteTokens ?? 0,
      cost_micro_usd: e.run?.costMicroUsd ?? null,
      duration_ms: e.durationMs,
      tool_calls: e.run?.toolCalls ?? 0,
    })
    .select("id")
    .single();
  // The answer matters more than its log: a failed insert is reported, never shown to the user.
  if (error) {
    console.error("[advisor] log failed", error.code, error.message);
    return null;
  }
  return String(data.id);
}
