import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type AdvisorEvent, encodeEvent } from "@/lib/advisor/sse";
import { useAdvisorChat } from "./useAdvisorChat";

const open = vi.hoisted(() => vi.fn());
vi.mock("@/app/actions/advisor", () => ({ openAdvisorConversation: open }));

const turn = { requestId: "r1", question: "Ce la facciamo?", text: "Sì.", refused: false, verdict: null, paymentPlan: false, rating: null };

/** Fetch answering with the given events, split in awkward chunks like a real stream. */
function streamOf(events: AdvisorEvent[]) {
  const text = events.map(encodeEvent).join("");
  return vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
    async () =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(c) {
            for (const chunk of [text.slice(0, 15), text.slice(15)]) c.enqueue(new TextEncoder().encode(chunk));
            c.close();
          },
        }),
      ),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("useAdvisorChat", () => {
  it("streams a new conversation and keeps its id for the next question", async () => {
    vi.stubGlobal("fetch", streamOf([{ type: "conversation", id: "c1", title: "Ce la facciamo?" }, { type: "status", label: "Simulo lo scenario…" }, { type: "done", turn }]));
    const { result } = renderHook(() => useAdvisorChat());
    await act(() => result.current.ask("Ce la facciamo?", "/"));
    expect(result.current).toMatchObject({ conversationId: "c1", title: "Ce la facciamo?", turns: [turn], pending: null, error: null });

    const next = streamOf([{ type: "done", turn: { ...turn, requestId: "r2" } }]);
    vi.stubGlobal("fetch", next);
    await act(() => result.current.ask("E se aspettiamo?", "/"));
    expect(JSON.parse(String(next.mock.calls[0][1]?.body))).toMatchObject({ conversationId: "c1", question: "E se aspettiamo?" });
    expect(result.current.turns).toHaveLength(2);
  });

  it("shows server and network errors", async () => {
    vi.stubGlobal("fetch", streamOf([{ type: "error", message: "Limite raggiunto." }]));
    const { result } = renderHook(() => useAdvisorChat());
    await act(() => result.current.ask("Ce la facciamo?", null));
    expect(result.current).toMatchObject({ error: "Limite raggiunto.", pending: null });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("offline");
      }),
    );
    await act(() => result.current.ask("Ce la facciamo?", null));
    expect(result.current.error).toMatch(/non raggiungibile/);
  });

  it("opens a stored conversation and resets", async () => {
    open.mockResolvedValue({ id: "c9", title: "Tesla", turns: [turn] });
    const { result } = renderHook(() => useAdvisorChat());
    await act(() => result.current.open("c9"));
    expect(result.current).toMatchObject({ conversationId: "c9", title: "Tesla", turns: [turn] });
    act(() => result.current.reset());
    expect(result.current).toMatchObject({ conversationId: null, turns: [] });
  });
});
