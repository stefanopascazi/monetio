// Category proposals for bank movements: the same learner the CSV import uses, fed with the
// household's categorised movements the consent owner can see.
import type { Category } from "../../domain/types.ts";
import { type CategorisedMovement, suggestCategories } from "../../import/categories.ts";
import type { Decision } from "./match.ts";

export type CategoryHints = { history: CategorisedMovement[]; categories: Category[] };

/** Inserted movements get the suggested category when one is found; others are left as they are. */
export function withSuggestedCategories(decisions: Decision[], hints: CategoryHints): Decision[] {
  const inserts = decisions.flatMap((d, i) => (d.type === "insert" ? [{ line: i, d }] : []));
  if (!inserts.length || !hints.history.length) return decisions;
  const drafts = inserts.map(({ line, d }) => ({
    line,
    bookedOn: d.movement.bookedOn,
    amountCents: d.movement.amountCents,
    description: d.movement.description,
    category: null,
  }));
  const suggested = suggestCategories(drafts, hints.history, hints.categories);
  return decisions.map((d, i) => (d.type === "insert" && suggested.has(i) ? { ...d, categoryId: suggested.get(i)! } : d));
}
