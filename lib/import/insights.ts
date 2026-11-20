// What the preview suggests beyond statuses: a category per row and rules for recurring movements.
import type { Category, ISODate } from "../domain/types";
import type { DraftStatus } from "./classify";
import { type CategoryMatch, createMatcher } from "./matches";
import { detectRecurring, type ExistingRule, type PastMovement, type RecurringProposal } from "./recurring";
import { matchCategory } from "./rows";
import type { ImportDraft } from "./types";

export interface ImportInsights {
  /** [line, categoryId] pairs (plain arrays survive the Server Action boundary). */
  suggestions: [number, string][];
  recurring: RecurringProposal[];
}

export interface InsightInput {
  drafts: ImportDraft[];
  statuses: DraftStatus[];
  /** Category matches of the target account. */
  matches: CategoryMatch[];
  accountHistory: PastMovement[];
  rules: ExistingRule[];
  categories: Category[];
  today: ISODate;
}

/** Category per draft line: the one named in the file first, else the account's match for its description. */
export function suggestCategories(drafts: ImportDraft[], matches: CategoryMatch[], categories: Category[]): Map<number, string> {
  const matched = createMatcher(matches, categories);
  const out = new Map<number, string>();
  for (const d of drafts) {
    const id = matchCategory(d.category, d.amountCents, categories) ?? matched(d.description, d.amountCents);
    if (id) out.set(d.line, id);
  }
  return out;
}

export function buildInsights(i: InsightInput): ImportInsights {
  const suggestions = suggestCategories(i.drafts, i.matches, i.categories);
  // Only rows that will become new plain movements join the account history; duplicates are already in it.
  const fresh = i.drafts
    .filter((_, idx) => i.statuses[idx]?.kind === "new" || i.statuses[idx]?.kind === "possible")
    .map((d) => ({ bookedOn: d.bookedOn, amountCents: d.amountCents, description: d.description, categoryId: suggestions.get(d.line) ?? null }));
  return { suggestions: [...suggestions], recurring: detectRecurring([...i.accountHistory, ...fresh], i.rules, i.today) };
}
