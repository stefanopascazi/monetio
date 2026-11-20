// Category matches per account: identical descriptions (same direction of money) share the category
// the user chose once. Pure helpers shared by the app, the bank sync and the worker.
import type { Category } from "../domain/types.ts";
import { normalizeDescription } from "./dedup.ts";
import { validCategory } from "./categories.ts";

export type Direction = 1 | -1;

export interface CategoryMatch {
  key: string;
  direction: Direction;
  categoryId: string;
}

/**
 * Normalised description without the parts that change between identical movements: any word holding
 * a digit (dates, card numbers, mandate and CRO codes, instalment numbers). Empty = nothing to match on.
 */
export function matchKey(description: string): string {
  return normalizeDescription(description)
    .split(" ")
    .filter((t) => t && !/\d/.test(t))
    .join(" ");
}

export const directionOf = (amountCents: number): Direction => (amountCents > 0 ? 1 : -1);

const lookupKey = (key: string, direction: Direction) => `${direction}|${key}`;

/** Same key and same direction of money. */
export function isIdentical(a: { description: string; amountCents: number }, b: { description: string; amountCents: number }): boolean {
  const key = matchKey(a.description);
  return key !== "" && key === matchKey(b.description) && directionOf(a.amountCents) === directionOf(b.amountCents);
}

/** Finds the matched category of a movement, if still usable for its direction. */
export function createMatcher(matches: CategoryMatch[], categories: Category[]) {
  const byKey = new Map(matches.map((m) => [lookupKey(m.key, m.direction), m.categoryId]));
  return (description: string, amountCents: number): string | null => {
    const key = matchKey(description);
    if (!key) return null;
    return validCategory(byKey.get(lookupKey(key, directionOf(amountCents))), amountCents, categories);
  };
}

export interface CategorisableMovement {
  id: string;
  description: string;
  amountCents: number;
  categoryId: string | null;
}

/**
 * Movements a choice applies to: identical to the chosen one and without category, or still on the
 * category the old match gave them (`replacing`). Categories set by hand to something else stay.
 */
export function propagationTargets<T extends CategorisableMovement>(movements: T[], chosen: { description: string; amountCents: number }, replacing: string | null): T[] {
  return movements.filter((m) => isIdentical(m, chosen) && (m.categoryId === null || (replacing !== null && m.categoryId === replacing)));
}

export interface UncategorisedGroup {
  key: string;
  direction: Direction;
  /** Most recent original description of the group. */
  description: string;
  count: number;
  totalCents: number;
}

/** Movements without category grouped by identical description; biggest groups first. */
export function uncategorisedGroups(movements: { description: string; amountCents: number; bookedOn: string }[]): UncategorisedGroup[] {
  const groups = new Map<string, UncategorisedGroup & { latest: string }>();
  for (const m of movements) {
    const key = matchKey(m.description);
    if (!key) continue;
    const direction = directionOf(m.amountCents);
    const id = lookupKey(key, direction);
    const g = groups.get(id);
    if (!g) groups.set(id, { key, direction, description: m.description, count: 1, totalCents: m.amountCents, latest: m.bookedOn });
    else {
      g.count++;
      g.totalCents += m.amountCents;
      if (m.bookedOn > g.latest) {
        g.latest = m.bookedOn;
        g.description = m.description;
      }
    }
  }
  return [...groups.values()]
    .sort((a, b) => b.count - a.count || Math.abs(b.totalCents) - Math.abs(a.totalCents) || a.key.localeCompare(b.key))
    .map(({ key, direction, description, count, totalCents }) => ({ key, direction, description, count, totalCents }));
}
