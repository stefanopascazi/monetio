import { describe, expect, it } from "vitest";
import type { DueEntry } from "../domain/schedule";
import { entryTransaction, transactionRows } from "./rows";

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
