import { describe, expect, it, vi } from "vitest";
import type { TransactionResource } from "../enable-banking/types";
import { countDecisions, type SyncStore, type SyncTarget, syncBankAccount, syncFrom } from "./run";

const target: SyncTarget = {
  bankAccountId: "ba1",
  uid: "u1",
  userId: "user-1",
  householdId: "h1",
  accountId: "acc1",
  openingDate: "2026-01-01",
  lastSyncedAt: null,
  connectionCreatedAt: new Date("2026-11-18T10:00:00Z"),
};
const now = new Date("2026-11-18T12:00:00Z");

const txn = (ref: string, date: string, amount: string, dir: "CRDT" | "DBIT" = "DBIT"): TransactionResource => ({
  entry_reference: ref,
  booking_date: date,
  transaction_amount: { currency: "EUR", amount },
  credit_debit_indicator: dir,
  status: "BOOK",
  remittance_information: [`Mov ${ref}`],
});

describe("syncFrom", () => {
  it("reads 30 days before the consent on the first sync, 7 days of overlap afterwards", () => {
    expect(syncFrom(target)).toBe("2026-10-19");
    expect(syncFrom({ ...target, lastSyncedAt: new Date("2026-11-18T06:00:00Z") })).toBe("2026-11-11");
  });

  it("never reads before the account's opening date", () => {
    expect(syncFrom({ ...target, openingDate: "2026-11-01" })).toBe("2026-11-01");
  });
});

describe("syncBankAccount", () => {
  it("matches the bank's movements and stores balance and outcome", async () => {
    const client = {
      getBalances: vi.fn(async () => [{ balance_amount: { currency: "EUR", amount: "950.00" }, balance_type: "CLBD", reference_date: "2026-11-18" }]),
      getTransactions: vi.fn(async () => [txn("old", "2025-12-30", "5.00"), txn("b", "2026-11-12", "20.00"), txn("a", "2026-11-10", "50.00"), txn("c", "2026-11-13", "8.00")]),
    };
    const store: SyncStore = {
      loadExisting: vi.fn(async () => ({
        candidates: [{ id: "t1", bookedOn: "2026-11-09", amountCents: -5000, description: "Bolletta", fromRule: true, bankRef: null }],
        reviewRefs: ["c"],
      })),
      apply: vi.fn(async () => {}),
      saveStatus: vi.fn(async () => {}),
    };

    const counts = await syncBankAccount({ ...target, openingDate: "2026-01-01" }, client, store, now);

    expect(client.getTransactions).toHaveBeenCalledWith("u1", "2026-10-19");
    expect(store.loadExisting).toHaveBeenCalledWith("acc1", "2026-10-14");
    const decisions = vi.mocked(store.apply).mock.calls[0][1];
    // Movements before the opening date are dropped; the rest run oldest first.
    expect(decisions.map((d) => [d.type, d.movement.ref])).toEqual([
      ["reconcile", "a"],
      ["insert", "b"],
      ["skip", "c"],
    ]);
    expect(counts).toEqual({ inserted: 1, reconciled: 1, review: 0, skipped: 1, from: "2026-10-19", fetched: 4, balances: 1 });
    expect(store.saveStatus).toHaveBeenCalledWith("ba1", { syncedAt: now, balance: { cents: 95000, date: "2026-11-18" }, error: null });
  });
});

describe("countDecisions", () => {
  it("counts by type", () => {
    const m = { ref: "r", bookedOn: "2026-11-01", amountCents: 1, description: "", counterpartyIban: null } as const;
    expect(countDecisions([{ type: "review", movement: m, reason: "ambiguous", candidateId: null }])).toEqual({ inserted: 0, reconciled: 0, review: 1, skipped: 0 });
  });
});
