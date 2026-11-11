import { describe, expect, it } from "vitest";
import type { DueEntry } from "../domain/schedule";
import type { MonthlyFlow } from "./flows";
import { accountFacts } from "./reliability-facts";

const flow = (month: string, kind: MonthlyFlow["kind"], totalCents: number, accountId = "a"): MonthlyFlow => ({ accountId, month, kind, totalCents, categoryId: null, counterpartAccountId: null });
const due = (ruleId: string, overdue: boolean, accountId = "a") => ({ ruleId, overdue, accountId, source: "rule" }) as DueEntry;

describe("accountFacts", () => {
  it("counts history months, averages the last full months of spending and splits deadlines", () => {
    const [f] = accountFacts({
      accounts: [{ id: "a", name: "Conto" }],
      today: "2026-11-11",
      lastBooked: { a: "2026-11-09" },
      flows: [
        flow("2025-11", "expense", -999),
        flow("2025-12", "income", 100),
        flow("2026-08", "expense", -30000),
        flow("2026-09", "expense", -30000),
        flow("2026-09", "expense", 3000),
        flow("2026-10", "expense", -30000),
        flow("2026-10", "transfer", -50000),
        flow("2026-11", "expense", -99999),
        flow("2026-10", "expense", -1, "b"),
        flow("2026-07", "adjustment", 5),
      ],
      summary: { a: { rulesIncomeCents: 0, rulesExpenseCents: 25000, transfersCents: 0, netCents: 0 } },
      due: [due("est", true), due("bill", true), due("bill", false), due("other", true, "b")],
      estimateRuleIds: new Set(["est"]),
      missingRules: { a: 2 },
    });
    expect(f).toEqual({
      accountId: "a",
      name: "Conto",
      lastBookedOn: "2026-11-09",
      historyMonths: 5,
      avgMonthlyExpenseCents: 29000,
      declaredMonthlyExpenseCents: 25000,
      overdueCount: 1,
      openEstimates: 1,
      missingRules: 2,
    });
  });

  it("defaults missing data to an empty account", () => {
    const [f] = accountFacts({ accounts: [{ id: "a", name: "Nuovo" }], today: "2026-11-11", lastBooked: {}, flows: [], summary: {}, due: [], estimateRuleIds: new Set(), missingRules: {} });
    expect(f).toMatchObject({ lastBookedOn: null, historyMonths: 0, avgMonthlyExpenseCents: 0, declaredMonthlyExpenseCents: 0, overdueCount: 0, openEstimates: 0, missingRules: 0 });
  });
});
