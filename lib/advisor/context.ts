// What the advisor can see of a household: built server-side from the viewer's visible data only.
import type { ProjectionInput } from "../domain/projection";
import type { ReliabilityLevel, UncertaintyBand } from "../domain/reliability";
import type { AccountType } from "../domain/types";

export interface AdvisorAccount {
  id: string;
  name: string;
  type: AccountType;
}

export interface AdvisorCategory {
  id: string;
  name: string;
}

export interface AdvisorContext {
  input: ProjectionInput;
  accounts: AdvisorAccount[];
  /** Expense categories, the only ones a cut may target. */
  categories: AdvisorCategory[];
  reliability: { score: number; level: ReliabilityLevel };
  bands: Record<string, UncertaintyBand>;
}

/** Accounts money is spent from: savings and investments are a reserve, not a budget. */
const LIQUID: AccountType[] = ["checking", "card", "cash"];

export function liquidAccountIds(ctx: AdvisorContext): string[] {
  return ctx.accounts.filter((a) => LIQUID.includes(a.type)).map((a) => a.id);
}

/** Accounts a purchase must never push below zero: cards run negative until the statement by design. */
export function nonNegativeAccountIds(ctx: AdvisorContext): string[] {
  return ctx.accounts.filter((a) => a.type !== "card").map((a) => a.id);
}

/** Months of spending kept aside as an emergency fund when a plan dips into savings. */
export const RESERVE_MONTHS = 3;
