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

/**
 * Realistic household for live evals: two salaries plus thirteenth month, mortgage, nursery until July,
 * monthly estimates, yearly car costs, 200 € a month already moved to savings. Joint account nets about +490 €/month.
 */
export function familyContext(): AdvisorContext {
  const joint = (id: string, amountCents: number, p: Partial<Parameters<typeof rule>[0]> = {}) =>
    rule({ id, accountId: "joint", amountCents, description: id, dayOfMonth: 1, startDate: "2026-01-01", ...p });
  const estimate = (id: string, amountCents: number, categoryId: string) => joint(id, amountCents, { categoryId, schedule: "estimate" });
  return {
    input: {
      today: "2026-11-05",
      months: 1,
      balances: { joint: 420000, savings: 1200000 },
      rules: [
        joint("Stipendio Luca", 210000, { dayOfMonth: 27 }),
        joint("Stipendio Sara", 165000, { dayOfMonth: 10 }),
        joint("Tredicesima Luca", 210000, { frequency: "yearly", dayOfMonth: 15, startDate: "2026-12-15" }),
        joint("Tredicesima Sara", 165000, { frequency: "yearly", dayOfMonth: 15, startDate: "2026-12-15" }),
        joint("Mutuo", -78000, { categoryId: "home" }),
        joint("Luce e gas", -16000, { categoryId: "utilities", dayOfMonth: 20 }),
        joint("Telefonia", -6000, { categoryId: "utilities", dayOfMonth: 12 }),
        joint("Asilo", -45000, { categoryId: "childcare", dayOfMonth: 5, endDate: "2027-07-31" }),
        joint("Palestra", -7000, { categoryId: "sport", dayOfMonth: 3 }),
        joint("Assicurazione auto", -62000, { categoryId: "car", frequency: "yearly", dayOfMonth: 10, startDate: "2027-03-10" }),
        joint("Bollo auto", -24000, { categoryId: "car", frequency: "yearly", dayOfMonth: 30, startDate: "2027-04-30" }),
        estimate("Spesa", -65000, "food"),
        estimate("Ristoranti", -18000, "restaurants"),
        estimate("Svago", -15000, "leisure"),
        estimate("Abbigliamento", -12000, "clothing"),
        estimate("Carburante", -14000, "fuel"),
        estimate("Varie", -30000, "misc"),
        joint("Accantonamento", -20000, { kind: "transfer", counterpartAccountId: "savings", dayOfMonth: 28 }),
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
      { id: "home", name: "Mutuo" },
      { id: "utilities", name: "Utenze" },
      { id: "childcare", name: "Asilo" },
      { id: "sport", name: "Sport" },
      { id: "car", name: "Auto" },
      { id: "food", name: "Spesa" },
      { id: "restaurants", name: "Ristoranti" },
      { id: "leisure", name: "Svago" },
      { id: "clothing", name: "Abbigliamento" },
      { id: "fuel", name: "Carburante" },
      { id: "misc", name: "Varie" },
    ],
    reliability: { score: 68, level: "medium" },
    bands: { joint: { avgMonthlyExpenseCents: 306000, level: "medium" }, savings: { avgMonthlyExpenseCents: 0, level: "medium" } },
  };
}
