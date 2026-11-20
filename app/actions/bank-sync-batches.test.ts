import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/data/context", () => ({ getContext: vi.fn(async () => ({ userId: "user-1" })) }));
const rpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ rpc })) }));

const getBankSyncBatchDetail = vi.fn();
vi.mock("@/lib/data/bank-sync-batches", () => ({ getBankSyncBatchDetail: (batchId: string) => getBankSyncBatchDetail(batchId) }));

const { loadBankSyncBatchDetail, undoBankSync } = await import("./bank-sync-batches");
const id = "11111111-2222-3333-4444-555555555555";

describe("loadBankSyncBatchDetail", () => {
  it("returns the batch movements", async () => {
    const detail = { inserted: [], reconciled: [], reviews: [] };
    getBankSyncBatchDetail.mockResolvedValue(detail);
    expect(await loadBankSyncBatchDetail(id)).toEqual({ ok: true, detail });
    expect(getBankSyncBatchDetail).toHaveBeenCalledWith(id);
  });

  it("reports load errors and bad ids", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    getBankSyncBatchDetail.mockRejectedValue({ code: "XX000", message: "boom" });
    expect((await loadBankSyncBatchDetail(id)).ok).toBe(false);
    expect((await loadBankSyncBatchDetail("x")).ok).toBe(false);
    expect(getBankSyncBatchDetail).toHaveBeenCalledTimes(1);
  });
});

beforeEach(() => vi.clearAllMocks());

describe("undoBankSync", () => {
  it("undoes through the RPC and reports deleted movements", async () => {
    rpc.mockResolvedValue({ data: 3, error: null });
    expect(await undoBankSync(id)).toMatchObject({ ok: true, message: "Aggiornamento annullato: 3 movimenti cancellati." });
    expect(rpc).toHaveBeenCalledWith("undo_bank_sync", { p_batch: id });
  });

  it("uses the singular and the plain message", async () => {
    rpc.mockResolvedValue({ data: 1, error: null });
    expect((await undoBankSync(id)).message).toBe("Aggiornamento annullato: 1 movimento cancellato.");
    rpc.mockResolvedValue({ data: 0, error: null });
    expect((await undoBankSync(id)).message).toBe("Aggiornamento annullato.");
  });

  it("explains a batch already undone or a newer one", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "P0002", message: "batch not found" } });
    expect((await undoBankSync(id)).message).toMatch(/già annullato/);
    rpc.mockResolvedValue({ data: null, error: { code: "55000", message: "newer batch first" } });
    expect((await undoBankSync(id)).message).toMatch(/più recenti/);
  });

  it("rejects bad ids", async () => {
    expect((await undoBankSync("x")).ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
});
