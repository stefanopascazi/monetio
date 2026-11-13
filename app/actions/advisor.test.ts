import { beforeEach, describe, expect, it, vi } from "vitest";
import { advisorContext } from "@/lib/advisor/fixtures";

const data = vi.hoisted(() => ({
  advisorClient: vi.fn(() => ({})),
  advisorEnabled: vi.fn(() => true),
  advisorModel: vi.fn(() => undefined),
  advisorDailyLimit: vi.fn(() => 20),
  countRecentRequests: vi.fn(async () => 0),
  loadAdvisorContext: vi.fn(),
  logAdvisorRequest: vi.fn(async () => "req-1"),
  rateAdvisorRequest: vi.fn(async () => true),
}));
const runAdvisor = vi.hoisted(() => vi.fn());

vi.mock("@/lib/data/advisor", () => data);
vi.mock("@/lib/advisor/run", () => ({ DEFAULT_ADVISOR_MODEL: "claude-opus-5-5", runAdvisor }));

const { askAdvisor, rateAdvisorAnswer } = await import("./advisor");

const fd = (question: string) => {
  const f = new FormData();
  f.set("question", question);
  return f;
};
const QUESTION = "Possiamo permetterci una vacanza?";
const run = { text: "Sì.", refused: false, verdict: null, paymentPlan: false, model: "claude-opus-5-5", stopReason: "end_turn", usage: {}, costMicroUsd: 1, toolCalls: 1 };

beforeEach(() => {
  vi.clearAllMocks();
  data.advisorEnabled.mockReturnValue(true);
  data.countRecentRequests.mockResolvedValue(0);
  data.loadAdvisorContext.mockResolvedValue(advisorContext());
});

describe("askAdvisor", () => {
  it("answers and logs the request", async () => {
    runAdvisor.mockResolvedValue(run);
    const res = await askAdvisor({}, fd(QUESTION));
    expect(res).toEqual({ ok: true, answer: { question: QUESTION, text: "Sì.", refused: false, verdict: null, paymentPlan: false, requestId: "req-1" } });
    expect(data.logAdvisorRequest).toHaveBeenCalledWith(expect.objectContaining({ question: QUESTION, run, model: "claude-opus-5-5" }));
  });

  it("does nothing when the advisor is off", async () => {
    data.advisorEnabled.mockReturnValue(false);
    expect(await askAdvisor({}, fd(QUESTION))).toEqual({ ok: false, message: "L'assistente non è attivo." });
    expect(runAdvisor).not.toHaveBeenCalled();
  });

  it("stops at the daily limit", async () => {
    data.countRecentRequests.mockResolvedValue(20);
    expect((await askAdvisor({}, fd(QUESTION))).message).toBe("Hai raggiunto il limite di 20 domande nelle ultime 24 ore.");
    expect(runAdvisor).not.toHaveBeenCalled();
  });

  it("logs a failed call without an answer", async () => {
    runAdvisor.mockRejectedValue(new TypeError("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await askAdvisor({}, fd(QUESTION))).toEqual({ ok: false, message: "Non sono riuscito a rispondere. Riprova." });
    expect(data.logAdvisorRequest).toHaveBeenCalledWith(expect.objectContaining({ run: null, error: "TypeError" }));
  });
});

describe("rateAdvisorAnswer", () => {
  it("saves a valid rating and rejects bad input", async () => {
    const id = "11111111-2222-3333-4444-555555555555";
    expect(await rateAdvisorAnswer(id, 1)).toEqual({ ok: true });
    expect(data.rateAdvisorRequest).toHaveBeenCalledWith(id, 1);
    expect(await rateAdvisorAnswer("x", 1)).toEqual({ ok: false });
    expect(await rateAdvisorAnswer(id, 0 as 1)).toEqual({ ok: false });
  });
});
