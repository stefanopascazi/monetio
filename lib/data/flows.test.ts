import { describe, expect, it } from "vitest";
import { contribution } from "../domain/fixtures";
import { cashflowSeries, categorySlices, contributionSpendingFrom, estimateUsedFrom, mapFlow, type MonthlyFlow } from "./flows";

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
  });

  it("measures what is already booked towards an estimate", () => {
    const used = estimateUsedFrom([...flows, f({ totalCents: -12000, kind: "transfer", categoryId: "figli", counterpartAccountId: "asha" }), f({ totalCents: -700, categoryId: "figli" })]);
    const est = { accountId: "joint", kind: "expense" as const, counterpartAccountId: null, amountCents: -1 };
    expect(used({ ...est, categoryId: "luce" }, "2026-10")).toBe(9000);
    expect(used({ ...est, categoryId: null }, "2026-10")).toBe(37757);
    // Income estimates are reduced by money received.
    expect(used({ ...est, accountId: "ste", kind: "income", categoryId: "stip", amountCents: 1 }, "2026-10")).toBe(200000);
    // Transfer estimates only by transfers to the same counterpart, not by expenses of the category.
    expect(used({ ...est, kind: "transfer", counterpartAccountId: "asha", categoryId: "figli" }, "2026-10")).toBe(12000);
    expect(used({ ...est, kind: "transfer", counterpartAccountId: "ste", categoryId: "figli" }, "2026-10")).toBe(0);
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
