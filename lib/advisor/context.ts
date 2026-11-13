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
