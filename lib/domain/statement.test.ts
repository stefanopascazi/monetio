import { describe, expect, it } from "vitest";
import { txn } from "./fixtures";
import { balanceAt, groupByMonthDesc, monthlyTotals, withRunningBalance } from "./statement";

const txns = [
  txn({ id: "b", amountCents: -5000, bookedOn: "2026-10-10" }),
  txn({ id: "a", amountCents: 200000, bookedOn: "2026-10-01" }),
  txn({ id: "c", amountCents: -1000, bookedOn: "2026-11-02" }),
  txn({ id: "p", amountCents: -999999, bookedOn: "2026-11-03", status: "planned" }),
];

describe("withRunningBalance", () => {
  it("orders by date and accumulates from the opening balance, skipping planned", () => {
    const rows = withRunningBalance(10000, txns);
    expect(rows.map((r) => [r.id, r.balanceAfterCents])).toEqual([
      ["a", 210000],
      ["b", 205000],
      ["c", 204000],
    ]);
  });
});

describe("balanceAt", () => {
  it("includes booked rows up to the date", () => {
    expect(balanceAt(10000, txns, "2026-10-31")).toBe(205000);
  });
});

describe("monthlyTotals", () => {
  it("splits income and expense and ignores internal transfers", () => {
    const rows = [
      ...txns,
      txn({ id: "t1", kind: "transfer", counterpartAccountId: "a2", amountCents: -80000, bookedOn: "2026-10-28" }),
      txn({ id: "t2", kind: "transfer", counterpartAccountId: "ext", amountCents: -3000, bookedOn: "2026-10-28" }),
    ];
    expect(monthlyTotals(rows, new Set(["a1", "a2"]))).toEqual([
      { month: "2026-10", incomeCents: 200000, expenseCents: 8000 },
      { month: "2026-11", incomeCents: 0, expenseCents: 1000 },
    ]);
  });
});

describe("groupByMonthDesc", () => {
  it("groups newest first", () => {
    const groups = groupByMonthDesc(txns.slice(0, 3));
    expect(groups.map((g) => [g.month, g.rows.map((r) => r.id)])).toEqual([
      ["2026-11", ["c"]],
      ["2026-10", ["b", "a"]],
    ]);
  });
});
