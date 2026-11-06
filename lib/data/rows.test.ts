import { describe, expect, it } from "vitest";
import type { DueEntry } from "../domain/schedule";
import { entryTransaction, feeTransaction, paymentRows, transactionRows } from "./rows";

describe("feeTransaction", () => {
  it("links the fee to its payment with the same account, date and status", () => {
    const fee = feeTransaction(
      { id: "p", householdId: "h", accountId: "a", kind: "expense", amountCents: -100, bookedOn: "2026-11-05", description: "Luce", status: "planned", paymentMethod: "cbill" },
      150,
      "fees",
    );
    expect(fee).toMatchObject({ parentTransactionId: "p", accountId: "a", amountCents: -150, categoryId: "fees", status: "planned", description: "Spese CBill · Luce" });
  });
});

describe("transactionRows", () => {
  it("creates a single row for income/expense", () => {
    const rows = transactionRows({ householdId: "h", accountId: "a", kind: "expense", amountCents: -500, bookedOn: "2026-11-05", description: "Bar" });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ account_id: "a", amount_cents: -500, transfer_group_id: null, status: "booked", source: "manual" });
  });

  it("creates two mirrored rows for a transfer", () => {
    const rows = transactionRows(
      { householdId: "h", accountId: "ste", counterpartAccountId: "joint", kind: "transfer", amountCents: -80000, bookedOn: "2026-11-28", description: "Quota" },
      () => "g1",
    );
    expect(rows.map((r) => [r.account_id, r.counterpart_account_id, r.amount_cents, r.transfer_group_id])).toEqual([
      ["ste", "joint", -80000, "g1"],
      ["joint", "ste", 80000, "g1"],
    ]);
  });
});

describe("paymentRows", () => {
  const base = { householdId: "h", accountId: "a", kind: "expense" as const, amountCents: -300000, bookedOn: "2026-11-05", description: "Affitto", status: "planned" as const, createdBy: "u" };

  it("adds a linked negative fee row for a bonifico", () => {
    const ids = ["p1", "f1"];
    const rows = paymentRows({ ...base, paymentMethod: "bank_transfer" }, 65, { feeCategoryId: "fees", newId: () => ids.shift()! });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: "p1", amount_cents: -300000, payment_method: "bank_transfer", parent_transaction_id: null });
    expect(Object.keys(rows[1]).sort()).toEqual(Object.keys(rows[0]).sort());
    expect(rows[1]).toMatchObject({
      id: "f1",
      category_id: "fees",
      account_id: "a",
      amount_cents: -65,
      kind: "expense",
      status: "planned",
      booked_on: "2026-11-05",
      description: "Spese bonifico · Affitto",
      parent_transaction_id: "p1",
      payment_method: null,
      created_by: "u",
    });
  });

  it("links the fee of a transfer to its paying side", () => {
    const ids = ["p1", "f1", "g1", "m1"];
    const rows = paymentRows({ ...base, kind: "transfer", counterpartAccountId: "b" }, 100, { feeCategoryId: "fees", newId: () => ids.shift()! });
    expect(rows).toHaveLength(3);
    // Same keys on every row, ids included, so the bulk insert never nulls a primary key.
    expect(rows.every((r) => Object.keys(r).sort().join() === Object.keys(rows[0]).sort().join())).toBe(true);
    expect(rows[0]).toMatchObject({ id: "p1", account_id: "a", amount_cents: -300000, transfer_group_id: "g1" });
    expect(rows[1]).toMatchObject({ id: "m1", account_id: "b", amount_cents: 300000, transfer_group_id: "g1" });
    expect(rows[2]).toMatchObject({ id: "f1", account_id: "a", amount_cents: -100, kind: "expense", transfer_group_id: null, parent_transaction_id: "p1", description: "Spese giroconto · Affitto" });
  });

  it("creates only the payment row without a fee", () => {
    const rows = paymentRows({ ...base, paymentMethod: "cbill" }, null);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ payment_method: "cbill", parent_transaction_id: null });
    expect(rows[0]).not.toHaveProperty("id");
  });

  it("ignores the fee for plain transactions", () => {
    expect(paymentRows(base, 65)).toHaveLength(1);
  });

  it("leaves the fee uncategorized without a default category", () => {
    expect(paymentRows({ ...base, paymentMethod: "cbill" }, 65)[1]).toMatchObject({ category_id: null, description: "Spese CBill · Affitto" });
  });
});

describe("entryTransaction", () => {
  const entry: DueEntry = {
    key: "c:c1|2026-11-28",
    source: "contribution",
    ruleId: "c1",
    date: "2026-11-28",
    occurrenceDate: "2026-11-28",
    accountId: "ste",
    counterpartAccountId: "joint",
    categoryId: null,
    kind: "transfer",
    description: "Quota",
    amountCents: -95000,
    overdue: false,
    estimated: true,
    confirmed: false,
    paymentMethod: null,
    feeCents: 0,
  };

  it("links the scheduled occurrence even when the due date moved", () => {
    expect(entryTransaction({ ...entry, date: "2026-12-02" }, { householdId: "h", userId: "u" }).occurrenceDate).toBe("2026-11-28");
  });

  it("links the occurrence and accepts overrides", () => {
    expect(entryTransaction(entry, { householdId: "h", userId: "u" }, { amountCents: -96000, bookedOn: "2026-11-30" })).toMatchObject({
      contributionRuleId: "c1",
      recurringRuleId: null,
      occurrenceDate: "2026-11-28",
      bookedOn: "2026-11-30",
      amountCents: -96000,
      source: "contribution",
    });
  });
});
