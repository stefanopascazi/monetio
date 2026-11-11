import { describe, expect, it } from "vitest";
import type { MonthlyFlow } from "./flows";
import { categoryComparison, type ExpenseRow, fixedAndVariable, periodTotals, topMerchants } from "./statistics";

const flow = (month: string, kind: MonthlyFlow["kind"], totalCents: number, categoryId: string | null = null): MonthlyFlow => ({
  accountId: "a",
  month,
  kind,
  totalCents,
  categoryId,
  counterpartAccountId: null,
});
const row = (description: string, amountCents: number, bookedOn = "2026-10-01", fromRule = false, categoryId: string | null = null): ExpenseRow => ({
  accountId: "a",
  description,
  amountCents,
  bookedOn,
  categoryId,
  fromRule,
});

describe("periodTotals", () => {
  it("sums income and expenses of the period, without transfers", () => {
    const flows = [flow("2026-09", "income", 200000), flow("2026-09", "expense", -150000), flow("2026-10", "expense", -50000), flow("2026-10", "transfer", -999), flow("2026-08", "income", 7)];
    expect(periodTotals(flows, ["2026-09", "2026-10"])).toEqual({ incomeCents: 200000, expenseCents: 200000, savedCents: 0, avgMonthlyExpenseCents: 100000 });
    expect(periodTotals([], []).avgMonthlyExpenseCents).toBe(0);
  });
});

describe("categoryComparison", () => {
  it("compares the month with the average of the base months", () => {
    const flows = [
      flow("2026-10", "expense", -30000, "spesa"),
      flow("2026-09", "expense", -20000, "spesa"),
      flow("2026-08", "expense", -20000, "spesa"),
      flow("2026-08", "expense", -10000, "bar"),
      flow("2026-10", "expense", -5000, null),
      flow("2026-10", "income", 99999, "spesa"),
    ];
    expect(categoryComparison(flows, "2026-10", ["2026-08", "2026-09"], [{ id: "spesa", name: "Spesa" }, { id: "bar", name: "Bar" }])).toEqual([
      { categoryId: "spesa", name: "Spesa", currentCents: 30000, averageCents: 20000, deltaPct: 50 },
      { categoryId: null, name: "Senza categoria", currentCents: 5000, averageCents: 0, deltaPct: null },
      { categoryId: "bar", name: "Bar", currentCents: 0, averageCents: 5000, deltaPct: -100 },
    ]);
  });
});

describe("topMerchants", () => {
  it("groups by merchant, nets refunds and ranks by spending", () => {
    const rows = [
      row("PAGAMENTO POS CONAD 123", -5000, "2026-10-01"),
      row("Pagamento POS Conad 456", -3000, "2026-10-05"),
      row("POS CONAD 789", 1000, "2026-10-06"),
      row("NETFLIX.COM", -1299),
      row("Reso AMAZON", 2000),
    ];
    expect(topMerchants(rows)).toEqual([
      { label: "Conad", totalCents: 7000, count: 2 },
      { label: "Netflix", totalCents: 1299, count: 1 },
    ]);
    expect(topMerchants(rows, 1)).toHaveLength(1);
  });
});

describe("fixedAndVariable", () => {
  it("splits rule-booked expenses from the rest", () => {
    expect(fixedAndVariable([row("Affitto", -80000, "2026-10-01", true), row("Bar", -500), row("Rimborso", 200)])).toEqual({ fixedCents: 80000, variableCents: 300 });
  });

  it("counts imported expenses in the category of a fixed rule as fixed", () => {
    const rows = [row("RATA MUTUO", -78110, "2026-10-01", false, "mutuo"), row("Bar", -500, "2026-10-01", false, "bar")];
    expect(fixedAndVariable(rows, new Set(["mutuo"]))).toEqual({ fixedCents: 78110, variableCents: 500 });
  });
});
