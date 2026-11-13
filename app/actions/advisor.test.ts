import { beforeEach, describe, expect, it, vi } from "vitest";

const data = vi.hoisted(() => ({ advisorEnabled: vi.fn(() => true), loadAdvisorQuota: vi.fn(async () => ({ leftToday: 5, leftMonth: 30 })), rateAdvisorRequest: vi.fn(async () => true) }));
const conv = vi.hoisted(() => ({ deleteConversations: vi.fn(async () => 1), listConversations: vi.fn(async () => []), loadConversation: vi.fn(async () => null) }));
vi.mock("@/lib/data/advisor", () => data);
vi.mock("@/lib/data/advisor-conversations", () => conv);

const { deleteAdvisorConversation, getAdvisorQuota, openAdvisorConversation, rateAdvisorAnswer } = await import("./advisor");
const ID = "11111111-2222-3333-4444-555555555555";

beforeEach(() => vi.clearAllMocks());

describe("advisor actions", () => {
  it("saves a valid rating and rejects bad input", async () => {
    expect(await rateAdvisorAnswer(ID, 1)).toEqual({ ok: true });
    expect(data.rateAdvisorRequest).toHaveBeenCalledWith(ID, 1);
    expect(await rateAdvisorAnswer("x", 1)).toEqual({ ok: false });
    expect(await rateAdvisorAnswer(ID, 0 as 1)).toEqual({ ok: false });
  });

  it("opens only well-formed conversation ids", async () => {
    expect(await openAdvisorConversation("x")).toBeNull();
    expect(conv.loadConversation).not.toHaveBeenCalled();
    await openAdvisorConversation(ID);
    expect(conv.loadConversation).toHaveBeenCalledWith(ID);
  });

  it("deletes one or all conversations", async () => {
    expect(await deleteAdvisorConversation(ID)).toEqual({ ok: true });
    expect(await deleteAdvisorConversation(null)).toEqual({ ok: true });
    expect(conv.deleteConversations.mock.calls).toEqual([[ID], [null]]);
    expect(await deleteAdvisorConversation("x")).toEqual({ ok: false });
  });

  it("loads the quota only while the assistant is on", async () => {
    expect(await getAdvisorQuota()).toEqual({ leftToday: 5, leftMonth: 30 });
    data.advisorEnabled.mockReturnValueOnce(false);
    expect(await getAdvisorQuota()).toBeNull();
  });
});
