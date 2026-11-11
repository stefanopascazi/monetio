// Category suggestions: each draft takes the category of the household's most similar categorised movement.
import type { Category } from "../domain/types";
import { findNoise, merchantTokens, overlap, withCompounds } from "./merchant";
import { matchCategory } from "./rows";
import type { ImportDraft } from "./types";

export interface CategorisedMovement {
  description: string;
  amountCents: number;
  categoryId: string;
}

/** Share of a draft's merchant words that must match a past movement. */
export const SUGGESTION_THRESHOLD = 0.6;

interface Profile {
  tokens: string[];
  categoryId: string;
  sign: number;
  count: number;
}

/** One profile per (merchant words, category, sign), counting how often it occurred. */
function profiles(history: CategorisedMovement[], noise: ReadonlySet<string>): Profile[] {
  const byKey = new Map<string, Profile>();
  for (const h of history) {
    const tokens = merchantTokens(h.description, noise);
    if (!tokens.length) continue;
    const sign = Math.sign(h.amountCents);
    const key = `${tokens.join(" ")}|${h.categoryId}|${sign}`;
    const p = byKey.get(key);
    if (p) p.count++;
    else byKey.set(key, { tokens, categoryId: h.categoryId, sign, count: 1 });
  }
  return [...byKey.values()];
}

/**
 * Suggested category per draft line. A category named in the file wins; otherwise the best match by
 * shared merchant words (same direction of money), ties broken by how often that category was used.
 */
export function suggestCategories(drafts: ImportDraft[], history: CategorisedMovement[], categories: Category[]): Map<number, string> {
  const usable = new Set(categories.filter((c) => !c.archived).map((c) => c.id));
  const noise = findNoise([...drafts, ...history].map((x) => x.description));
  const known = profiles(history, noise).filter((p) => usable.has(p.categoryId));
  const out = new Map<number, string>();
  for (const d of drafts) {
    const named = matchCategory(d.category, d.amountCents, categories);
    if (named) {
      out.set(d.line, named);
      continue;
    }
    const tokens = withCompounds(merchantTokens(d.description, noise));
    let best: Profile | null = null;
    let bestScore = 0;
    for (const p of known) {
      if (p.sign !== Math.sign(d.amountCents)) continue;
      const score = overlap(tokens, p.tokens);
      if (score < SUGGESTION_THRESHOLD) continue;
      if (score > bestScore || (score === bestScore && best && p.count > best.count)) {
        best = p;
        bestScore = score;
      }
    }
    if (best) out.set(d.line, best.categoryId);
  }
  return out;
}

/** Category the user picked for a line, if valid for its direction of money; otherwise null. */
export function validCategory(categoryId: string | null | undefined, amountCents: number, categories: Category[]): string | null {
  if (!categoryId) return null;
  const kind = amountCents > 0 ? "income" : "expense";
  const c = categories.find((x) => x.id === categoryId);
  return c && !c.archived && (c.kind === kind || c.kind === "both") ? c.id : null;
}
