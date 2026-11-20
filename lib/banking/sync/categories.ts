// Categories of bank movements: inserted ones take the account's match for their description.
import type { Category } from "../../domain/types.ts";
import { type CategoryMatch, createMatcher } from "../../import/matches.ts";
import type { Decision } from "./match.ts";

export type CategoryHints = { matches: CategoryMatch[]; categories: Category[] };

/** Inserted movements get the matched category when one exists; others are left as they are. */
export function withMatchedCategories(decisions: Decision[], hints: CategoryHints): Decision[] {
  if (!hints.matches.length) return decisions;
  const matched = createMatcher(hints.matches, hints.categories);
  return decisions.map((d) => {
    if (d.type !== "insert") return d;
    const categoryId = matched(d.movement.description, d.movement.amountCents);
    return categoryId ? { ...d, categoryId } : d;
  });
}
