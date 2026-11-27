// Bank movements without any detail (#132): description and category taken from the account's own
// history of movements with the same exact amount, when one pattern clearly dominates.
import type { Category, ISODate } from "../../domain/types.ts";
import { validCategory } from "../../import/categories.ts";
import { directionOf, isGenericDescription, matchKey } from "../../import/matches.ts";
import type { Decision } from "./match.ts";

/** Earlier movement of the account usable as evidence: real description, category set by people. */
export type HistoryMovement = { bookedOn: ISODate; amountCents: number; description: string; categoryId: string };

export type Inference = { description: string; categoryId: string; count: number };

/** Months of history looked at, as days. */
export const INFER_HISTORY_DAYS = 365;
/** Occurrences the winning description + category needs. */
export const INFER_MIN_COUNT = 2;
/** Share of the same-amount movements the winner needs. */
export const INFER_MIN_SHARE = 0.8;

/**
 * Description and category for a movement with the generic description, or null when the history
 * has fewer than `INFER_MIN_COUNT` matches for the winning pattern or a competing one is too strong.
 */
export function inferFromHistory(movement: { amountCents: number; description: string }, history: HistoryMovement[], categories: Category[]): Inference | null {
  if (!isGenericDescription(movement.description)) return null;
  const groups = new Map<string, { description: string; latest: ISODate; categoryId: string; count: number }>();
  let total = 0;
  for (const h of history) {
    if (h.amountCents !== movement.amountCents || directionOf(h.amountCents) !== directionOf(movement.amountCents)) continue;
    const key = matchKey(h.description);
    if (!key) continue;
    total++;
    const id = `${key}|${h.categoryId}`;
    const g = groups.get(id);
    if (!g) groups.set(id, { description: h.description, latest: h.bookedOn, categoryId: h.categoryId, count: 1 });
    else {
      g.count++;
      // The most recent wording is the one people use now.
      if (h.bookedOn > g.latest) {
        g.latest = h.bookedOn;
        g.description = h.description;
      }
    }
  }
  const best = [...groups.values()].sort((a, b) => b.count - a.count)[0];
  if (!best || best.count < INFER_MIN_COUNT || best.count / total < INFER_MIN_SHARE) return null;
  const categoryId = validCategory(best.categoryId, movement.amountCents, categories);
  return categoryId ? { description: best.description, categoryId, count: best.count } : null;
}

/** Amounts worth loading history for: new movements with the generic description. */
export function genericAmounts(decisions: Decision[]): number[] {
  return [...new Set(decisions.filter((d) => d.type === "insert" && isGenericDescription(d.movement.description)).map((d) => d.movement.amountCents))];
}

/** New generic movements get the inferred description and category; the rest stay as they are. */
export function withInferredDetails(decisions: Decision[], history: HistoryMovement[], categories: Category[]): Decision[] {
  if (!history.length) return decisions;
  return decisions.map((d) => {
    if (d.type !== "insert") return d;
    const inferred = inferFromHistory(d.movement, history, categories);
    return inferred ? { ...d, categoryId: inferred.categoryId, inferred: { description: inferred.description, count: inferred.count } } : d;
  });
}
