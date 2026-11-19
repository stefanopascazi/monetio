// Bank list helpers for the picker: banks already used shown first.

export type BankOption = { name: string };

/** Names of banks the person already linked, deduplicated, limited to banks still offered. */
export function recentBanks(banks: BankOption[], linkedNames: string[]): string[] {
  const offered = new Set(banks.map((b) => b.name));
  return [...new Set(linkedNames)].filter((n) => offered.has(n));
}

/** Already used banks first (in their order), then the rest as offered. */
export function recentFirst(banks: BankOption[], recent: string[]): BankOption[] {
  const rank = new Map(recent.map((n, i) => [n, i]));
  const top = banks.filter((b) => rank.has(b.name)).sort((a, b) => rank.get(a.name)! - rank.get(b.name)!);
  return [...top, ...banks.filter((b) => !rank.has(b.name))];
}
