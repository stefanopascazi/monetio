// Recurring items derived from the sheet's manual projections (rows from Nov 2026 on).
// Amounts and days are a starting point: everything stays editable in the app.
import type { AccountKey } from "./mapping.ts";

export interface SeedRule {
  account: AccountKey;
  counterpart?: AccountKey;
  category: string;
  kind: "income" | "expense" | "transfer";
  description: string;
  amountCents: number;
  frequency: "weekly" | "monthly" | "bimonthly" | "quarterly" | "semiannual" | "yearly";
  schedule: "auto" | "due" | "estimate";
  dayOfMonth: number;
  startDate: string;
  endDate?: string;
}

export interface SeedContribution {
  from: AccountKey;
  to: AccountKey;
  description: string;
  fixedCents: number;
  sharePercent: number;
  categories: string[];
  dayOfMonth: number;
  estimatedSpendingCents: number;
  startDate: string;
  spendingAccount?: AccountKey;
  spendingMonthOffset?: 0 | -1;
  roundingCents?: number;
}

const START = "2026-11-01";

export const SEED_RULES: SeedRule[] = [
  // Joint account
  { account: "joint", category: "Mutuo", kind: "expense", description: "Rata mutuo", amountCents: -78110, frequency: "monthly", schedule: "auto", dayOfMonth: 1, startDate: START, endDate: "2046-10-31" },
  { account: "joint", category: "Finanziamenti", kind: "expense", description: "Rata finanziamento", amountCents: -26950, frequency: "monthly", schedule: "auto", dayOfMonth: 1, startDate: START, endDate: "2029-04-30" },
  { account: "joint", category: "Abbonamenti", kind: "expense", description: "Netflix", amountCents: -1399, frequency: "monthly", schedule: "auto", dayOfMonth: 1, startDate: START },
  { account: "joint", category: "Telefono e internet", kind: "expense", description: "WindTre", amountCents: -3598, frequency: "monthly", schedule: "auto", dayOfMonth: 1, startDate: START },
  { account: "joint", category: "Luce", kind: "expense", description: "Bolletta luce", amountCents: -10000, frequency: "monthly", schedule: "due", dayOfMonth: 15, startDate: START },
  { account: "joint", category: "Gas", kind: "expense", description: "Bolletta gas", amountCents: -7000, frequency: "monthly", schedule: "due", dayOfMonth: 15, startDate: START },
  { account: "joint", category: "Acqua", kind: "expense", description: "Bolletta acqua", amountCents: -6000, frequency: "bimonthly", schedule: "due", dayOfMonth: 15, startDate: "2026-12-01" },
  { account: "joint", category: "Rifiuti", kind: "expense", description: "TARI (rata gennaio)", amountCents: -6000, frequency: "yearly", schedule: "due", dayOfMonth: 15, startDate: "2027-01-01" },
  { account: "joint", category: "Rifiuti", kind: "expense", description: "TARI (rata marzo)", amountCents: -6000, frequency: "yearly", schedule: "due", dayOfMonth: 15, startDate: "2027-03-01" },
  { account: "joint", category: "Rifiuti", kind: "expense", description: "TARI (rata ottobre)", amountCents: -6000, frequency: "yearly", schedule: "due", dayOfMonth: 15, startDate: "2027-10-01" },
  { account: "joint", category: "Finanziamenti", kind: "expense", description: "Finanziamento Daniele e Isa", amountCents: -300065, frequency: "yearly", schedule: "due", dayOfMonth: 15, startDate: "2027-01-01" },
  { account: "joint", category: "Extra", kind: "expense", description: "Spesa annuale di ottobre", amountCents: -24600, frequency: "yearly", schedule: "due", dayOfMonth: 15, startDate: "2027-10-01" },
  { account: "joint", category: "Assegni e bonus", kind: "income", description: "Assegno unico", amountCents: 17870, frequency: "monthly", schedule: "auto", dayOfMonth: 20, startDate: START, endDate: "2043-04-30" },
  { account: "joint", category: "Figli", kind: "expense", description: "Baby-sitter", amountCents: -24000, frequency: "monthly", schedule: "estimate", dayOfMonth: 28, startDate: "2027-01-01", endDate: "2036-12-31" },
  // Groceries are paid with the Conad card; its statement is settled from the joint account (see contributions).
  { account: "conad", category: "Spesa", kind: "expense", description: "Spesa del mese (stima)", amountCents: -45000, frequency: "monthly", schedule: "estimate", dayOfMonth: 28, startDate: START },
  // Fixed monthly quotas into the joint account.
  { account: "ste", counterpart: "joint", category: "Quote e giroconti", kind: "transfer", description: "Quota fissa Ste", amountCents: -80000, frequency: "monthly", schedule: "due", dayOfMonth: 3, startDate: START },
  { account: "asha", counterpart: "joint", category: "Quote e giroconti", kind: "transfer", description: "Quota fissa Asha", amountCents: -80000, frequency: "monthly", schedule: "due", dayOfMonth: 10, startDate: START },
  // Ste
  { account: "ste", category: "Stipendio", kind: "income", description: "Stipendio", amountCents: 220000, frequency: "monthly", schedule: "auto", dayOfMonth: 27, startDate: START },
  { account: "ste", counterpart: "joint", category: "Quote e giroconti", kind: "transfer", description: "Quota finanziamento", amountCents: -26950, frequency: "monthly", schedule: "auto", dayOfMonth: 27, startDate: START, endDate: "2029-03-31" },
  { account: "ste", category: "Finanziamenti", kind: "expense", description: "Finanziamento Ste", amountCents: -7399, frequency: "monthly", schedule: "auto", dayOfMonth: 1, startDate: START, endDate: "2027-11-30" },
  { account: "ste", category: "Finanziamenti", kind: "expense", description: "Altre rate", amountCents: -4733, frequency: "monthly", schedule: "auto", dayOfMonth: 1, startDate: START, endDate: "2028-02-29" },
  { account: "ste", category: "Risparmio e investimenti", kind: "expense", description: "Risparmio Giulia", amountCents: -5000, frequency: "monthly", schedule: "auto", dayOfMonth: 27, startDate: START },
  { account: "ste", category: "Spese varie", kind: "expense", description: "Spese del mese (stima)", amountCents: -40000, frequency: "monthly", schedule: "estimate", dayOfMonth: 28, startDate: START },
  // Asha
  { account: "asha", category: "Stipendio", kind: "income", description: "Stipendio", amountCents: 190000, frequency: "monthly", schedule: "auto", dayOfMonth: 27, startDate: START },
  { account: "asha", category: "Tredicesima e bonus", kind: "income", description: "Tredicesima", amountCents: 122500, frequency: "yearly", schedule: "due", dayOfMonth: 20, startDate: "2026-12-01" },
  { account: "asha", category: "Risparmio e investimenti", kind: "expense", description: "Investimenti", amountCents: -5000, frequency: "monthly", schedule: "auto", dayOfMonth: 1, startDate: START },
  { account: "asha", category: "Salute", kind: "expense", description: "Psicologa", amountCents: -6500, frequency: "monthly", schedule: "due", dayOfMonth: 10, startDate: START, endDate: "2027-01-31" },
  { account: "asha", category: "Spese varie", kind: "expense", description: "Spese varie di aprile", amountCents: -40000, frequency: "yearly", schedule: "due", dayOfMonth: 15, startDate: "2027-04-01" },
  { account: "asha", category: "Spese varie", kind: "expense", description: "Spese del mese (stima)", amountCents: -70000, frequency: "monthly", schedule: "estimate", dayOfMonth: 28, startDate: START },
];

// Grocery of month M is on the Conad card; its statement (≈ day 1-2 of M+1) is charged on the joint
// account on day 5, and each person transfers CEILING(statement / 2, 10) with their fixed quota.
const CARD = { spendingAccount: "conad" as const, spendingMonthOffset: -1 as const, categories: ["Spesa"], estimatedSpendingCents: 45000, startDate: "2026-12-01" };
export const SEED_CONTRIBUTIONS: SeedContribution[] = [
  { ...CARD, from: "joint", to: "conad", description: "Estratto conto Carta Conad", fixedCents: 0, sharePercent: 100, dayOfMonth: 5, roundingCents: 1 },
  { ...CARD, from: "ste", to: "joint", description: "Quota spesa Ste", fixedCents: 0, sharePercent: 50, dayOfMonth: 3 },
  { ...CARD, from: "asha", to: "joint", description: "Quota spesa Asha", fixedCents: 0, sharePercent: 50, dayOfMonth: 10 },
];
