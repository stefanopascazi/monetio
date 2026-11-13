import { beforeEach, describe, expect, it, vi } from "vitest";
import { advisorContext } from "../advisor/fixtures";
import { advisorQuota, DEFAULT_LIMITS } from "../advisor/quota";
import type { AdvisorEvent } from "../advisor/sse";

const quota = (userToday: number, householdMonth: number) => advisorQuota({ userToday, householdMonth }, DEFAULT_LIMITS);

vi.mock("server-only", () => ({}));
const data = vi.hoisted(() => ({
  advisorClient: vi.fn(() => ({})),
  advisorEnabled: vi.fn(() => true),
  advisorModel: vi.fn(() => undefined),
  loadAdvisorQuota: vi.fn(async () => quota(0, 0)),
  loadAdvisorContext: vi.fn(),
  logAdvisorRequest: vi.fn(async () => "req-1"),
}));
const conv = vi.hoisted(() => ({
  createConversation: vi.fn(async () => "conv-new"),
  loadConversationRows: vi.fn(),
  touchConversation: vi.fn(async () => {}),
}));
const runAdvisor = vi.hoisted(() => vi.fn());
vi.mock("./advisor", () => data);
vi.mock("./advisor-conversations", () => conv);
vi.mock("../advisor/run", () => ({ DEFAULT_ADVISOR_MODEL: "claude-sonnet-5-5", runAdvisor }));

const { answerChat } = await import("./advisor-chat");

const QUESTION = "Possiamo permetterci una vacanza?";
const run = { text: "Sì.", refused: false, verdict: null, paymentPlan: false, model: "claude-sonnet-5-5", stopReason: "end_turn", usage: {}, costMicroUsd: 1, toolCalls: 1 };
const row = (turn: number) => ({ id: `r${turn}`, turn, question: `Q${turn}?`, answer: `A${turn}`, verdict: null, refused: false, payment_plan: false, rating: null });

async function ask(req: Parameters<typeof answerChat>[0]) {
  const events: AdvisorEvent[] = [];
  await answerChat(req, (e) => events.push(e));
  return events;
}

beforeEach(() => {
  vi.clearAllMocks();
  data.advisorEnabled.mockReturnValue(true);
  data.loadAdvisorQuota.mockResolvedValue(quota(2, 10));
  data.loadAdvisorContext.mockResolvedValue(advisorContext());
  runAdvisor.mockImplementation(async (_q, _ctx, _client, options) => {
    options.onTool?.("simulate_scenario");
    return run;
  });
});

describe("answerChat", () => {
  it("starts a conversation, streams progress and logs the first turn", async () => {
    const events = await ask({ question: QUESTION, page: "/analisi/proiezioni" });
    expect(events).toEqual([
      { type: "conversation", id: "conv-new", title: QUESTION },
      { type: "status", label: "Simulo lo scenario…" },
      { type: "done", turn: { requestId: "req-1", question: QUESTION, text: "Sì.", refused: false, verdict: null, paymentPlan: false, rating: null } },
      { type: "quota", quota: quota(3, 11) },
    ]);
    expect(runAdvisor.mock.calls[0][0]).toBe(`[Pagina aperta: Proiezioni]\n${QUESTION}`);
    expect(data.logAdvisorRequest).toHaveBeenCalledWith(expect.objectContaining({ conversationId: "conv-new", turn: 1, question: QUESTION }));
    expect(conv.touchConversation).toHaveBeenCalledWith("conv-new");
  });

  it("continues a conversation with its history", async () => {
    conv.loadConversationRows.mockResolvedValue({ title: "T", rows: [row(1), row(2)] });
    await ask({ question: QUESTION, conversationId: "conv-1" });
    expect(conv.createConversation).not.toHaveBeenCalled();
    expect(runAdvisor.mock.calls[0][3].history).toEqual([
      { role: "user", content: "Q1?" },
      { role: "assistant", content: "A1" },
      { role: "user", content: "Q2?" },
      { role: "assistant", content: "A2" },
    ]);
    expect(data.logAdvisorRequest).toHaveBeenCalledWith(expect.objectContaining({ conversationId: "conv-1", turn: 3 }));
  });

  it("refuses an unknown or full conversation", async () => {
    conv.loadConversationRows.mockResolvedValue(null);
    expect(await ask({ question: QUESTION, conversationId: "x" })).toEqual([{ type: "error", message: "Conversazione non trovata. Iniziane una nuova." }]);
    conv.loadConversationRows.mockResolvedValue({ title: "T", rows: Array.from({ length: 10 }, (_, i) => row(i + 1)) });
    expect(await ask({ question: QUESTION, conversationId: "x" })).toEqual([{ type: "error", message: "Questa conversazione ha raggiunto 10 domande: iniziane una nuova." }]);
    expect(runAdvisor).not.toHaveBeenCalled();
  });

  it("checks the switch, the question and the quota first", async () => {
    expect(await ask({ question: "ciao" })).toEqual([{ type: "error", message: "Scrivi una domanda." }]);
    data.loadAdvisorQuota.mockResolvedValue(quota(10, 20));
    expect(await ask({ question: QUESTION })).toEqual([
      { type: "quota", quota: quota(10, 20) },
      { type: "error", message: "Hai usato le 10 domande di oggi: riprova domani." },
    ]);
    data.loadAdvisorQuota.mockResolvedValue(quota(0, 50));
    expect((await ask({ question: QUESTION })).at(-1)).toEqual({ type: "error", message: "Avete usato le 50 domande di questo mese: tornano disponibili dal 1° del mese prossimo." });
    data.advisorEnabled.mockReturnValue(false);
    expect(await ask({ question: QUESTION })).toEqual([{ type: "error", message: "L'assistente non è attivo." }]);
    expect(runAdvisor).not.toHaveBeenCalled();
  });

  it("logs a failed call and reports a generic error", async () => {
    runAdvisor.mockRejectedValue(new TypeError("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const events = await ask({ question: QUESTION });
    expect(events.at(-1)).toEqual({ type: "error", message: "Non sono riuscito a rispondere. Riprova." });
    expect(data.logAdvisorRequest).toHaveBeenCalledWith(expect.objectContaining({ run: null, error: "TypeError", turn: 1 }));
  });
});
