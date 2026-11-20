import { describe, expect, it } from "vitest";
import { batchSummary, type BankSyncBatch, changeNotes, mapBankSyncBatch, mapBatchDetail, undoableBatchId, undoMessage } from "./sync-batches";

describe("mapBatchDetail", () => {
  const mv = (id: string, cents: number | string) => ({ id, booked_on: "2026-11-15", amount_cents: cents, description: id });

  it("maps inserted, changed (fee rows out) and queued movements", () => {
    const d = mapBatchDetail({
      inserted: [mv("ins", "-700")],
      changes: [
        { prev_amount_cents: "-5000", prev_booked_on: "2026-11-10", prev_status: "planned", transaction: { ...mv("rec", -5000), status: "booked", parent_transaction_id: null } },
        { prev_amount_cents: -100, prev_booked_on: "2026-11-10", prev_status: "planned", transaction: { ...mv("fee", -100), status: "booked", parent_transaction_id: "rec" } },
        { prev_amount_cents: -1, prev_booked_on: "2026-11-10", prev_status: "booked", transaction: null },
      ],
      reviews: [
        { ...mv("open", -1), reason: "ambiguous", resolution: null },
        { ...mv("excl", -2), reason: "excluded", resolution: "ignored" },
        { ...mv("add", -3), reason: "amount_differs", resolution: "added" },
      ],
    });
    expect(d.inserted).toEqual([{ id: "ins", bookedOn: "2026-11-15", amountCents: -700, description: "ins" }]);
    expect(d.reconciled).toEqual([
      { id: "rec", bookedOn: "2026-11-15", amountCents: -5000, description: "rec", status: "booked", prevAmountCents: -5000, prevBookedOn: "2026-11-10", prevStatus: "planned" },
    ]);
    expect(d.reviews.map((r) => r.state)).toEqual(["open", "excluded", "added"]);
  });
});

describe("changeNotes", () => {
  const c = { id: "x", description: "x", bookedOn: "2026-11-15", amountCents: -100, status: "booked" as const, prevBookedOn: "2026-11-15", prevAmountCents: -100, prevStatus: "booked" as const };

  it("flags only what changed", () => {
    expect(changeNotes(c)).toEqual({ status: false, bookedOn: false, amount: false });
    expect(changeNotes({ ...c, prevStatus: "planned", prevBookedOn: "2026-11-10", prevAmountCents: -90 })).toEqual({ status: true, bookedOn: true, amount: true });
  });
});

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
