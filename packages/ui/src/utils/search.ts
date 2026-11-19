// Text matching for client-side filters: case and accent insensitive, every word must appear.

/** Lowercase, accents stripped: "Crédit" becomes "credit". */
export function foldText(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/** True when `text` contains every word of `query`, in any order; an empty query matches everything. */
export function matchesQuery(text: string, query: string): boolean {
  const words = foldText(query).split(/\s+/).filter(Boolean);
  const folded = foldText(text);
  return words.every((w) => folded.includes(w));
}
