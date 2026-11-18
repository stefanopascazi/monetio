import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/data/context", () => ({ getContext: vi.fn(async () => ({ userId: "user-1" })) }));
const rpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ rpc })) }));

const { resolveBankReview } = await import("./bank-reviews");
const id = "11111111-2222-3333-4444-555555555555";

beforeEach(() => vi.clearAllMocks());

describe("resolveBankReview", () => {
  it("resolves through the RPC", async () => {
    rpc.mockResolvedValue({ error: null });
    expect(await resolveBankReview(id, "matched")).toMatchObject({ ok: true, message: "Movimento abbinato con i dati della banca." });
    expect(rpc).toHaveBeenCalledWith("resolve_bank_review", { p_review: id, p_action: "matched" });
  });

  it("explains an item already resolved", async () => {
    rpc.mockResolvedValue({ error: { code: "P0002", message: "review not found" } });
    expect((await resolveBankReview(id, "ignored")).message).toMatch(/già risolto/);
  });

  it("rejects bad ids and actions", async () => {
    expect((await resolveBankReview("x", "added")).ok).toBe(false);
    expect((await resolveBankReview(id, "delete")).ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
});
