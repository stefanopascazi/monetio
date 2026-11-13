import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { advisorContext } from "./fixtures";
import { ADVISOR_REFUSAL, ADVISOR_SYSTEM_PROMPT } from "./perimeter";
import { type AdvisorClient, runAdvisor } from "./run";

type Block = Anthropic.Beta.BetaContentBlock;

function message(stop: string, content: unknown[], model = "claude-opus-5-5"): Anthropic.Beta.BetaMessage {
  return {
    id: "m",
    type: "message",
    role: "assistant",
    model,
    stop_reason: stop,
    content: content as Block[],
    usage: { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 500, cache_creation_input_tokens: 100 },
  } as unknown as Anthropic.Beta.BetaMessage;
}

const toolUse = (id: string, name: string, input: unknown) => ({ type: "tool_use", id, name, input });
const text = (t: string) => ({ type: "text", text: t });

function fakeClient(responses: Anthropic.Beta.BetaMessage[]) {
  const create = vi.fn<(params: Anthropic.Beta.MessageCreateParamsNonStreaming) => Promise<Anthropic.Beta.BetaMessage>>(async () => responses.shift()!);
  return { client: { beta: { messages: { create } } } as unknown as AdvisorClient, create };
}

const goal = { label: "Vacanza", amount_euros: 4500, date: "2027-01-05", account_id: "joint", cut_category_ids: [], scope_account_ids: [], floor_euros: 0 };

describe("runAdvisor", () => {
  it("runs the tools, keeps the engine verdict and sums usage and cost", async () => {
    const { client, create } = fakeClient([
      message("tool_use", [toolUse("t1", "get_household_overview", {})]),
      message("tool_use", [toolUse("t2", "assess_goal", goal)]),
      message("end_turn", [text("Sì, se rimandate a febbraio.")]),
    ]);
    const run = await runAdvisor("Possiamo permetterci 4.500 € a gennaio?", advisorContext(), client);

    expect(run).toMatchObject({ text: "Sì, se rimandate a febbraio.", refused: false, paymentPlan: false, stopReason: "end_turn", toolCalls: 2 });
    expect(run.verdict).toMatchObject({ outcome: "yes_if", shortfallCents: 30000 });
    expect(run.usage).toEqual({ inputTokens: 3000, outputTokens: 600, cacheReadTokens: 1500, cacheWriteTokens: 300 });
    // 3 x (1000 x 4 + 200 x 20 + 500 x 0.2 + 100 x 5) micro-dollars.
    expect(run.costMicroUsd).toBe(3 * 8600);

    const last = create.mock.calls[2][0];
    expect(last).toMatchObject({ model: "claude-opus-5-5", system: ADVISOR_SYSTEM_PROMPT, fallbacks: "default", betas: ["server-side-fallback-2026-07-01"] });
    // The tool result goes back to the model in the matching slot.
    const results = last.messages[4].content as Anthropic.Beta.BetaToolResultBlockParam[];
    expect(results[0]).toMatchObject({ type: "tool_result", tool_use_id: "t2" });
  });

  it("sends bad tool input back as an error result", async () => {
    const { client, create } = fakeClient([message("tool_use", [toolUse("t1", "assess_goal", { ...goal, account_id: "x" })]), message("end_turn", [text("Ok")])]);
    await runAdvisor("?", advisorContext(), client);
    const results = create.mock.calls[1][0].messages[2].content as Anthropic.Beta.BetaToolResultBlockParam[];
    expect(results[0]).toMatchObject({ is_error: true, content: "account_id: unknown account" });
  });

  it("flags an answer that checks the user's payment plan", async () => {
    const plan = {
      one_off_expenses: [{ label: "Anticipo", amount_euros: 1000, date: "2026-12-01", account_id: "joint" }],
      category_cuts: [],
      saving_plans: [],
      recurring_expenses: [{ label: "Rata", monthly_euros: 100, account_id: "joint", day_of_month: 1, start_date: "2026-12-01", end_date: "" }],
      user_payment_plan: true,
      months: 12,
      scope_account_ids: [],
      floor_euros: 0,
    };
    const { client } = fakeClient([message("tool_use", [toolUse("t1", "simulate_scenario", plan)]), message("end_turn", [text("Sì.")])]);
    expect((await runAdvisor("?", advisorContext(), client)).paymentPlan).toBe(true);
  });

  it("answers with a fixed message on a refusal", async () => {
    const { client } = fakeClient([message("refusal", [])]);
    const run = await runAdvisor("?", advisorContext(), client);
    expect(run).toMatchObject({ text: ADVISOR_REFUSAL, refused: true, verdict: null, stopReason: "refusal" });
  });

  it("stops after too many tool rounds", async () => {
    const { client, create } = fakeClient(Array.from({ length: 10 }, (_, i) => message("tool_use", [toolUse(`t${i}`, "get_household_overview", {})])));
    const run = await runAdvisor("?", advisorContext(), client);
    expect(create).toHaveBeenCalledTimes(8);
    expect(run.stopReason).toBe("max_iterations");
    expect(run.text).toMatch(/Non sono riuscito/);
  });

  it("leaves the cost unknown for a model without a price", async () => {
    const { client } = fakeClient([message("end_turn", [text("Ok")], "claude-unknown")]);
    expect((await runAdvisor("?", advisorContext(), client)).costMicroUsd).toBeNull();
  });
});
