// Test household for the advisor: joint account +400 €/month net, a savings account, two expense categories.
import { rule } from "../domain/fixtures";
import type { AdvisorContext } from "./context";

export function advisorContext(): AdvisorContext {
  return {
    input: {
      today: "2026-11-05",
      months: 1,
      balances: { joint: 300000, savings: 500000 },
      rules: [
        rule({ id: "stip", accountId: "joint", amountCents: 200000, dayOfMonth: 10, startDate: "2026-01-01" }),
        rule({ id: "spesa", accountId: "joint", categoryId: "food", amountCents: -60000, dayOfMonth: 15, startDate: "2026-01-01" }),
        rule({ id: "mutuo", accountId: "joint", categoryId: "home", amountCents: -100000, dayOfMonth: 20, startDate: "2026-01-01" }),
      ],
      contributions: [],
      booked: new Set(),
      contributionSpending: () => 0,
      estimateUsed: () => 0,
      planned: [],
      lookbackDays: 0,
    },
    accounts: [
      { id: "joint", name: "Conto comune", type: "checking" },
      { id: "savings", name: "Risparmi", type: "savings" },
    ],
    categories: [
      { id: "food", name: "Ristoranti" },
      { id: "home", name: "Mutuo" },
    ],
    reliability: { score: 80, level: "high" },
    bands: { joint: { avgMonthlyExpenseCents: 160000, level: "high" } },
  };
}
