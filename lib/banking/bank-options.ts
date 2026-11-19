// Bank list helpers for the picker: search and banks already used shown first.

export type BankOption = { name: string };

/** Lowercase, accents stripped: "Crédit" matches "credit". */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/** Banks whose name contains every word of the query; all banks for an empty query. */
export function filterBanks(banks: BankOption[], query: string): BankOption[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return banks;
  return banks.filter((b) => {
    const name = fold(b.name);
    return words.every((w) => name.includes(w));
  });
}

/** Names of banks the person already linked, deduplicated, limited to banks still offered. */
export function recentBanks(
  banks: BankOption[],
  linkedNames: string[],
): string[] {
  const offered = new Set(banks.map((b) => b.name));
  return [...new Set(linkedNames)].filter((n) => offered.has(n));
}

/** Already used banks first (in their order), then the rest as offered. */
export function recentFirst(
  banks: BankOption[],
  recent: string[],
): BankOption[] {
  const rank = new Map(recent.map((n, i) => [n, i]));
  const top = banks
    .filter((b) => rank.has(b.name))
    .sort((a, b) => rank.get(a.name)! - rank.get(b.name)!);
  return [...top, ...banks.filter((b) => !rank.has(b.name))];
}
