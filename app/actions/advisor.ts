"use server";

import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_ADVISOR_MODEL, runAdvisor } from "@/lib/advisor/run";
import { type VerdictView, verdictView } from "@/lib/advisor/view";
import {
  advisorClient,
  advisorDailyLimit,
  advisorEnabled,
  advisorModel,
  countRecentRequests,
  loadAdvisorContext,
  logAdvisorRequest,
  rateAdvisorRequest,
} from "@/lib/data/advisor";
import { isUUID } from "@/lib/forms/parse";
import { parseAdvisorQuestion } from "@/lib/forms/advisor";
import type { FieldErrors } from "@/lib/forms/parse";

export interface AdvisorAnswer {
  question: string;
  text: string;
  refused: boolean;
  verdict: VerdictView | null;
  /** Checks a payment plan the user brought: the card shows the stronger disclaimer. */
  paymentPlan: boolean;
  /** Log row to rate; null when logging failed. */
  requestId: string | null;
}

export interface AdvisorState {
  ok?: boolean;
  message?: string;
  errors?: FieldErrors;
  answer?: AdvisorAnswer;
}

/** Italian copy for API failures; the class name alone goes to the log. */
function apiErrorMessage(e: unknown): string {
  if (e instanceof Anthropic.RateLimitError) return "L'assistente è molto richiesto in questo momento. Riprova tra qualche minuto.";
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return "L'assistente non è configurato correttamente.";
  if (e instanceof Anthropic.APIConnectionError) return "Assistente non raggiungibile. Controlla la connessione e riprova.";
  return "Non sono riuscito a rispondere. Riprova.";
}

export async function askAdvisor(_prev: AdvisorState, fd: FormData): Promise<AdvisorState> {
  if (!advisorEnabled()) return { ok: false, message: "L'assistente non è attivo." };
  const parsed = parseAdvisorQuestion(fd);
  if (!parsed.ok) return { ok: false, message: "Controlla la domanda.", errors: parsed.errors };
  const question = parsed.value;
  const limit = advisorDailyLimit();
  if ((await countRecentRequests()) >= limit) return { ok: false, message: `Hai raggiunto il limite di ${limit} domande nelle ultime 24 ore.` };

  const model = advisorModel() ?? DEFAULT_ADVISOR_MODEL;
  const ctx = await loadAdvisorContext();
  const started = Date.now();
  try {
    const run = await runAdvisor(question, ctx, advisorClient(), model);
    const requestId = await logAdvisorRequest({ question, run, model, durationMs: Date.now() - started });
    const verdict = run.verdict ? verdictView(run.verdict, ctx) : null;
    return { ok: true, answer: { question, text: run.text, refused: run.refused, verdict, paymentPlan: run.paymentPlan, requestId } };
  } catch (e) {
    const name = e instanceof Error ? e.constructor.name : "UnknownError";
    console.error("[advisor] request failed", name, e instanceof Anthropic.APIError ? e.status : undefined);
    await logAdvisorRequest({ question, run: null, model, durationMs: Date.now() - started, error: name });
    return { ok: false, message: apiErrorMessage(e) };
  }
}

export async function rateAdvisorAnswer(id: string, rating: 1 | -1): Promise<{ ok: boolean }> {
  if (!isUUID(id) || (rating !== 1 && rating !== -1)) return { ok: false };
  return { ok: await rateAdvisorRequest(id, rating) };
}
