// Duplicate detection: same date + amount + normalised description, counted as a multiset
// so two identical movements on the same day (e.g. two coffees) are both kept.
import type { ISODate } from "../domain/types";
import type { ImportDraft } from "./types";

export interface Movement {
  bookedOn: ISODate;
  amountCents: number;
  description: string;
}

/** Lowercase, no accents, punctuation collapsed to single spaces. */
export function normalizeDescription(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function dedupKey(m: Movement): string {
  return `${m.bookedOn}|${m.amountCents}|${normalizeDescription(m.description)}`;
}

/** 32-bit FNV-1a, hex: keeps import refs short and stable. */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export interface KeyedDraft extends ImportDraft {
  /** Unique per account: stored in transactions.import_ref as a DB-level safety net. */
  importRef: string;
}

/** Adds an import ref; identical rows get an occurrence index so each stays unique. */
export function withImportRefs(accountId: string, drafts: ImportDraft[]): KeyedDraft[] {
  const seen = new Map<string, number>();
  return drafts.map((d) => {
    const key = dedupKey(d);
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    return { ...d, importRef: `imp:${accountId}:${d.bookedOn}:${d.amountCents}:${hash(normalizeDescription(d.description))}:${n}` };
  });
}

/** Splits drafts into new ones and those already present among the account's movements. */
export function splitDuplicates<T extends Movement>(drafts: T[], existing: Movement[]): { fresh: T[]; duplicates: T[] } {
  const counts = new Map<string, number>();
  for (const m of existing) {
    const key = dedupKey(m);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const fresh: T[] = [];
  const duplicates: T[] = [];
  for (const d of drafts) {
    const key = dedupKey(d);
    const left = counts.get(key) ?? 0;
    if (left > 0) {
      counts.set(key, left - 1);
      duplicates.push(d);
    } else fresh.push(d);
  }
  return { fresh, duplicates };
}
