import { describe, expect, it } from "vitest";
import { batchSummary, type BankSyncBatch, mapBankSyncBatch, undoableBatchId, undoMessage } from "./sync-batches";

const batch = (id: string, createdAt: string, undoneAt: string | null = null): BankSyncBatch => ({
  id,
  accountId: "acc",
  kind: "worker",
  inserted: 1,
  reconciled: 0,
  review: 0,
  createdAt,
  undoneAt,
});

describe("mapBankSyncBatch", () => {
  it("maps a row and normalizes counts and kind", () => {
    expect(
      mapBankSyncBatch({ id: "b", account_id: "acc", kind: "preview", inserted: "3", reconciled: 1, review: "0", created_at: "2026-11-20T08:00:00Z", undone_at: null }),
    ).toEqual({ id: "b", accountId: "acc", kind: "preview", inserted: 3, reconciled: 1, review: 0, createdAt: "2026-11-20T08:00:00Z", undoneAt: null });
    expect(mapBankSyncBatch({ id: "b", account_id: "a", kind: "x", inserted: 0, reconciled: 0, review: 0, created_at: "", undone_at: null }).kind).toBe("worker");
  });
});

describe("undoableBatchId", () => {
  it("picks the newest active batch", () => {
    expect(undoableBatchId([batch("old", "2026-11-19T08:00:00Z"), batch("new", "2026-11-20T08:00:00Z")])).toBe("new");
  });

  it("skips undone batches and returns null when none is active", () => {
    expect(undoableBatchId([batch("old", "2026-11-19T08:00:00Z"), batch("new", "2026-11-20T08:00:00Z", "2026-11-20T09:00:00Z")])).toBe("old");
    expect(undoableBatchId([batch("x", "2026-11-19T08:00:00Z", "2026-11-19T09:00:00Z")])).toBeNull();
    expect(undoableBatchId([])).toBeNull();
  });
});

describe("batchSummary", () => {
  it("lists non-zero counts with Italian plurals", () => {
    expect(batchSummary({ inserted: 3, reconciled: 1, review: 2 })).toBe("3 nuovi · 1 abbinato · 2 da rivedere");
    expect(batchSummary({ inserted: 1, reconciled: 2, review: 0 })).toBe("1 nuovo · 2 abbinati");
  });

  it("says when nothing was written", () => {
    expect(batchSummary({ inserted: 0, reconciled: 0, review: 0 })).toBe("Nessun movimento");
  });
});

describe("undoMessage", () => {
  it("mentions the preview only for the first import", () => {
    expect(undoMessage("preview")).toMatch(/anteprima/);
    expect(undoMessage("worker")).not.toMatch(/anteprima/);
    expect(undoMessage("worker")).toMatch(/rileggerà/);
  });
});
