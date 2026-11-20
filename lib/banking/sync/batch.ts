// One bank movement paying several recorded rule movements at once (e.g. a single transfer to a
// third account covering many rules). Finds the combinations whose amounts add up exactly.
import type { ISODate } from "../../domain/types.ts";

export type BatchItem = { id: string; bookedOn: ISODate; amountCents: number; counterpartId: string | null };

/** Rule movements per counterpart considered for one bank movement: keeps the search small. */
export const BATCH_MAX_ITEMS = 12;

const DAY_MS = 86_400_000;
const dayGap = (a: ISODate, b: ISODate) => Math.abs(Date.parse(a) - Date.parse(b)) / DAY_MS;

/** Every combination (2+ items, same counterpart) whose sum equals `amountCents`. */
export function batchCombos<T extends BatchItem>(amountCents: number, bookedOn: ISODate, items: T[]): T[][] {
  const byCounterpart = new Map<string, T[]>();
  for (const it of items) {
    // Each part is smaller than the whole and has its sign.
    if (Math.sign(it.amountCents) !== Math.sign(amountCents) || Math.abs(it.amountCents) >= Math.abs(amountCents)) continue;
    const key = it.counterpartId ?? "";
    byCounterpart.set(key, [...(byCounterpart.get(key) ?? []), it]);
  }
  const out: T[][] = [];
  for (const group of byCounterpart.values()) {
    const pool = [...group].sort((a, b) => dayGap(a.bookedOn, bookedOn) - dayGap(b.bookedOn, bookedOn)).slice(0, BATCH_MAX_ITEMS);
    for (let mask = 1; mask < 1 << pool.length; mask++) {
      const picked = pool.filter((_, i) => mask & (1 << i));
      if (picked.length < 2) continue;
      if (picked.reduce((s, p) => s + p.amountCents, 0) === amountCents) out.push(picked);
    }
  }
  return out;
}

/**
 * The combination to reconcile, or "ambiguous" when several fit and no single one has all its
 * movements on the same day (rules paid together usually share their date).
 */
export function pickBatch<T extends BatchItem>(combos: T[][]): T[] | "ambiguous" | null {
  if (!combos.length) return null;
  if (combos.length === 1) return combos[0];
  const sameDay = combos.filter((c) => c.every((p) => p.bookedOn === c[0].bookedOn));
  return sameDay.length === 1 ? sameDay[0] : "ambiguous";
}
