import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { canContinue, conversationTitle, historyMessages, MAX_TURNS, questionWithPage, toolStatus } from "../advisor/conversation";
import { DEFAULT_ADVISOR_MODEL, runAdvisor } from "../advisor/run";
import type { AdvisorEvent } from "../advisor/sse";
import { turnViews } from "../advisor/turns";
import { parseAdvisorQuestion } from "../forms/advisor";
import { advisorClient, advisorDailyLimit, advisorEnabled, advisorModel, countRecentRequests, loadAdvisorContext, logAdvisorRequest } from "./advisor";
import { createConversation, loadConversationRows, touchConversation } from "./advisor-conversations";

export interface ChatRequest {
  question: unknown;
  /** Continue this conversation; a new one starts when missing. */
  conversationId?: unknown;
  /** Page the chat was opened from, for the model and the suggestions. */
  page?: unknown;
}

/** Italian copy for API failures; the class name alone goes to the log. */
export function apiErrorMessage(e: unknown): string {
  if (e instanceof Anthropic.RateLimitError) return "L'assistente è molto richiesto in questo momento. Riprova tra qualche minuto.";
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return "L'assistente non è configurato correttamente.";
  if (e instanceof Anthropic.APIConnectionError) return "Assistente non raggiungibile. Controlla la connessione e riprova.";
  return "Non sono riuscito a rispondere. Riprova.";
}

/** Answers one chat message, emitting progress events; never throws (failures become an error event). */
export async function answerChat(req: ChatRequest, emit: (e: AdvisorEvent) => void): Promise<void> {
  if (!advisorEnabled()) return emit({ type: "error", message: "L'assistente non è attivo." });
  const parsed = parseAdvisorQuestion(req.question);
  if (!parsed.ok) return emit({ type: "error", message: parsed.errors.question ?? "Controlla la domanda." });
  const question = parsed.value;
  const page = typeof req.page === "string" ? req.page : null;
  const limit = advisorDailyLimit();
  if ((await countRecentRequests()) >= limit) return emit({ type: "error", message: `Hai raggiunto il limite di ${limit} domande nelle ultime 24 ore.` });

  let conversationId = typeof req.conversationId === "string" && req.conversationId ? req.conversationId : null;
  let rows: Awaited<ReturnType<typeof loadConversationRows>> = null;
  if (conversationId) {
    rows = await loadConversationRows(conversationId);
    if (!rows) return emit({ type: "error", message: "Conversazione non trovata. Iniziane una nuova." });
    if (!canContinue(rows.rows.length)) return emit({ type: "error", message: `Questa conversazione ha raggiunto ${MAX_TURNS} domande: iniziane una nuova.` });
  } else {
    const title = conversationTitle(question);
    conversationId = await createConversation(title);
    emit({ type: "conversation", id: conversationId, title });
  }

  const turn = (rows?.rows.length ?? 0) + 1;
  const model = advisorModel() ?? DEFAULT_ADVISOR_MODEL;
  const started = Date.now();
  try {
    const ctx = await loadAdvisorContext();
    const run = await runAdvisor(questionWithPage(question, page, ctx.accounts), ctx, advisorClient(), {
      model,
      history: historyMessages(rows?.rows ?? []),
      onTool: (name) => emit({ type: "status", label: toolStatus(name) }),
    });
    const requestId = await logAdvisorRequest({ conversationId, turn, question, run, model, durationMs: Date.now() - started });
    await touchConversation(conversationId);
    const [view] = turnViews(
      [{ id: requestId ?? "", question, answer: run.text, verdict: run.verdict, refused: run.refused, payment_plan: run.paymentPlan, rating: null }],
      ctx,
    );
    emit({ type: "done", turn: { ...view, requestId } });
  } catch (e) {
    const name = e instanceof Error ? e.constructor.name : "UnknownError";
    console.error("[advisor] request failed", name, e instanceof Anthropic.APIError ? e.status : undefined);
    await logAdvisorRequest({ conversationId, turn, question, run: null, model, durationMs: Date.now() - started, error: name }).catch(() => null);
    emit({ type: "error", message: apiErrorMessage(e) });
  }
}
