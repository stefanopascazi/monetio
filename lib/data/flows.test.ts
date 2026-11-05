import { describe, expect, it } from "vitest";
import { contribution } from "../domain/fixtures";
import { cashflowSeries, categorySlices, categorySpentFrom, contributionSpendingFrom, mapFlow, type MonthlyFlow } from "./flows";

const f = (p: Partial<MonthlyFlow> & Pick<MonthlyFlow, "totalCents">): MonthlyFlow => ({
  accountId: "joint",
  month: "2026-10",
  categoryId: "spesa",
  kind: p.totalCents < 0 ? "expense" : "income",
  counterpartAccountId: null,
  ...p,
});

const flows = [
  f({ totalCents: -28057 }),
  f({ totalCents: -9000, categoryId: "luce" }),
  f({ totalCents: 200000, categoryId: "stip", accountId: "ste" }),
  f({ totalCents: 80000, kind: "transfer", categoryId: null }),
  f({ totalCents: -500, kind: "adjustment", categoryId: null }),
  f({ totalCents: -1000, month: "2026-11" }),
];

describe("flows", () => {
  it("maps view rows", () => {
    expect(mapFlow({ account_id: "a", month: "2026-10-01", category_id: null, kind: "expense", counterpart_account_id: null, total_cents: "-5" })).toEqual({
      accountId: "a",
      month: "2026-10",
      categoryId: null,
      kind: "expense",
      counterpartAccountId: null,
      totalCents: -5,
    });
  });

  it("computes spending lookups", () => {
    expect(contributionSpendingFrom(flows)(contribution({ categoryIds: ["spesa"] }), "2026-10")).toBe(28057);
    // Spending read from another account (e.g. the card) instead of the receiving one.
    expect(contributionSpendingFrom(flows)(contribution({ categoryIds: ["stip"], spendingAccountId: "ste" }), "2026-10")).toBe(0);
    expect(contributionSpendingFrom(flows)(contribution({ categoryIds: ["spesa"], spendingAccountId: "ste" }), "2026-10")).toBe(0);
    expect(categorySpentFrom(flows)("joint", "luce", "2026-10")).toBe(9000);
    expect(categorySpentFrom(flows)("joint", null, "2026-10")).toBe(37057);
  });

  it("builds cash flow ignoring transfers and adjustments", () => {
    expect(cashflowSeries(flows, ["2026-10", "2026-11"])).toEqual([
      { label: "ott", incomeCents: 200000, expenseCents: 37057 },
      { label: "nov", incomeCents: 0, expenseCents: 1000 },
    ]);
  });

  it("builds category slices", () => {
    const cats = [
      { id: "spesa", name: "Spesa", kind: "expense" as const, icon: null, colorIndex: 1 as const },
      { id: "luce", name: "Luce", kind: "expense" as const, icon: null, colorIndex: 2 as const },
    ];
    expect(categorySlices(flows, "2026-10", cats)).toEqual([
      { label: "Spesa", valueCents: 28057 },
      { label: "Luce", valueCents: 9000 },
    ]);
  });
});
