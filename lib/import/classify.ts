// Classifies drafts against the account before importing: new, already present, possibly
// entered by hand (same amount, close date, different text) or covered by the opening balance.
import { daysBetween } from "../domain/dates";
import type { ISODate } from "../domain/types";
import { dedupKey, type Movement } from "./dedup";

export type DraftStatus =
  | { kind: "new" }
  | { kind: "duplicate" }
  | { kind: "possible"; match: Movement }
  | { kind: "beforeOpening" };

/** Days around a draft where a same-amount movement counts as a possible duplicate. */
export const POSSIBLE_WINDOW_DAYS = 4;

export function classifyDrafts(drafts: Movement[], existing: Movement[], openingDate: ISODate, windowDays = POSSIBLE_WINDOW_DAYS): DraftStatus[] {
  const used = new Array<boolean>(existing.length).fill(false);
  const byKey = new Map<string, number[]>();
  existing.forEach((m, i) => {
    const key = dedupKey(m);
    byKey.set(key, [...(byKey.get(key) ?? []), i]);
  });

  // The opening balance already includes movements up to its date.
  const statuses: (DraftStatus | null)[] = drafts.map((d) => (d.bookedOn <= openingDate ? { kind: "beforeOpening" } : null));

  // Exact matches first, so they never get consumed as "possible" by another draft.
  drafts.forEach((d, i) => {
    if (statuses[i]) return;
    const free = byKey.get(dedupKey(d))?.find((j) => !used[j]);
    if (free === undefined) return;
    used[free] = true;
    statuses[i] = { kind: "duplicate" };
  });

  return drafts.map((d, i) => {
    if (statuses[i]) return statuses[i];
    let best = -1;
    let bestGap = Infinity;
    existing.forEach((m, j) => {
      if (used[j] || m.amountCents !== d.amountCents) return;
      const gap = Math.abs(daysBetween(m.bookedOn, d.bookedOn));
      if (gap <= windowDays && gap < bestGap) {
        best = j;
        bestGap = gap;
      }
    });
    if (best < 0) return { kind: "new" };
    used[best] = true;
    return { kind: "possible", match: existing[best] };
  });
}
