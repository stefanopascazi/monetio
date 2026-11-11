// What the preview suggests beyond statuses: a category per row and rules for recurring movements.
import type { Category, ISODate } from "../domain/types";
import { type CategorisedMovement, suggestCategories } from "./categories";
import type { DraftStatus } from "./classify";
import { detectRecurring, type ExistingRule, type PastMovement, type RecurringProposal } from "./recurring";
import type { ImportDraft } from "./types";

export interface ImportInsights {
  /** [line, categoryId] pairs (plain arrays survive the Server Action boundary). */
  suggestions: [number, string][];
  recurring: RecurringProposal[];
}

export interface InsightInput {
  drafts: ImportDraft[];
  statuses: DraftStatus[];
  history: CategorisedMovement[];
  accountHistory: PastMovement[];
  rules: ExistingRule[];
  categories: Category[];
  today: ISODate;
}

export function buildInsights(i: InsightInput): ImportInsights {
  const suggestions = suggestCategories(i.drafts, i.history, i.categories);
  // Only rows that will become new plain movements join the account history; duplicates are already in it.
  const fresh = i.drafts
    .filter((_, idx) => i.statuses[idx]?.kind === "new" || i.statuses[idx]?.kind === "possible")
    .map((d) => ({ bookedOn: d.bookedOn, amountCents: d.amountCents, description: d.description, categoryId: suggestions.get(d.line) ?? null }));
  return { suggestions: [...suggestions], recurring: detectRecurring([...i.accountHistory, ...fresh], i.rules, i.today) };
}
