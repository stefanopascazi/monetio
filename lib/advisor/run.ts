// Tool-use loop of the advisor: the model plans and explains, the tools compute.
import type Anthropic from "@anthropic-ai/sdk";
import type { AdvisorContext } from "./context";
import { ADVISOR_REFUSAL, ADVISOR_SYSTEM_PROMPT } from "./perimeter";
import { type AdvisorUsage, addUsage, costMicroUsd, EMPTY_USAGE } from "./pricing";
import { ADVISOR_TOOLS, type AdvisorVerdict, runAdvisorTool } from "./tools";

export const DEFAULT_ADVISOR_MODEL = "claude-opus-5-5";
const MAX_ITERATIONS = 8;

/** The slice of the SDK client the loop needs (a fake in tests). */
export interface AdvisorClient {
  beta: { messages: { create(params: Anthropic.Beta.MessageCreateParamsNonStreaming): Promise<Anthropic.Beta.BetaMessage> } };
}

export interface AdvisorRun {
  text: string;
  refused: boolean;
  verdict: AdvisorVerdict | null;
  /** The answer evaluates a payment plan the user brought: shown with the stronger disclaimer. */
  paymentPlan: boolean;
  /** Model of the last response (a fallback model when the first one declined). */
  model: string;
  stopReason: string;
  usage: AdvisorUsage;
  costMicroUsd: number | null;
  toolCalls: number;
}

function usageOf(m: Anthropic.Beta.BetaMessage): AdvisorUsage {
  return {
    inputTokens: m.usage.input_tokens,
    outputTokens: m.usage.output_tokens,
    cacheReadTokens: m.usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: m.usage.cache_creation_input_tokens ?? 0,
  };
}

export interface AdvisorRunOptions {
  model?: string;
  /** Earlier exchanges of the same conversation, oldest first (see historyMessages). */
  history?: Anthropic.Beta.BetaMessageParam[];
  /** Called before each tool runs, to stream progress to the user. */
  onTool?: (name: string) => void;
}

export async function runAdvisor(question: string, ctx: AdvisorContext, client: AdvisorClient, options: AdvisorRunOptions = {}): Promise<AdvisorRun> {
  const { model = DEFAULT_ADVISOR_MODEL, history = [], onTool } = options;
  const messages: Anthropic.Beta.BetaMessageParam[] = [...history, { role: "user", content: question }];
  let usage = EMPTY_USAGE;
  let cost: number | null = 0;
  let verdict: AdvisorVerdict | null = null;
  let paymentPlan = false;
  let toolCalls = 0;
  let last: Anthropic.Beta.BetaMessage | null = null;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.beta.messages.create({
      model,
      max_tokens: 16000,
      // Fixed breakpoint on tools + system prompt: identical for every question, so later questions read it.
      system: [{ type: "text", text: ADVISOR_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: ADVISOR_TOOLS,
      messages,
      output_config: { effort: "medium" },
      // Moving breakpoint on the conversation: tool rounds of the same question reuse what came before.
      cache_control: { type: "ephemeral" },
      // On a safety decline the API retries on a fallback model inside the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    last = response;
    const u = usageOf(response);
    usage = addUsage(usage, u);
    const c = costMicroUsd(response.model, u);
    cost = cost === null || c === null ? null : cost + c;

    if (response.stop_reason === "refusal") {
      return { text: ADVISOR_REFUSAL, refused: true, verdict: null, paymentPlan: false, model: response.model, stopReason: "refusal", usage, costMicroUsd: cost, toolCalls };
    }
    if (response.stop_reason !== "tool_use" && response.stop_reason !== "pause_turn") break;

    messages.push({ role: "assistant", content: response.content });
    if (response.stop_reason === "pause_turn") continue;

    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      toolCalls++;
      onTool?.(block.name);
      const outcome = runAdvisorTool(block.name, block.input, ctx);
      if (outcome.verdict) verdict = outcome.verdict;
      if (outcome.paymentPlan) paymentPlan = true;
      results.push({ type: "tool_result", tool_use_id: block.id, content: outcome.content, ...(outcome.isError ? { is_error: true } : {}) });
    }
    messages.push({ role: "user", content: results });
  }

  const done = last && last.stop_reason !== "tool_use" && last.stop_reason !== "pause_turn";
  const text = done
    ? last!.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim()
    : "";
  return {
    text: text || "Non sono riuscito a completare l'analisi. Riprova con una domanda più semplice.",
    refused: false,
    verdict,
    paymentPlan,
    model: last?.model ?? model,
    stopReason: done ? String(last!.stop_reason) : "max_iterations",
    usage,
    costMicroUsd: cost,
    toolCalls,
  };
}
