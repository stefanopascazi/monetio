// Turns the ASPSP list into a readable overview: which banks exist, for whom,
// for how long a consent lasts, and whether the household's banks are among them.
import type { Aspsp } from "./types.ts";

/** Banks the household uses or plans to (#38): case-insensitive patterns on the bank name. */
export const PRIORITY_BANKS: Record<string, RegExp> = {
  "Intesa Sanpaolo": /intesa/i,
  UniCredit: /unicredit/i,
  BancoPosta: /bancoposta|poste/i,
  Fineco: /fineco/i,
  // Whole word only: "Banking" must not match.
  ING: /\bING\b/,
  Revolut: /revolut/i,
  "Cherry Bank": /cherry/i,
};

export type AspspRow = {
  name: string;
  personal: boolean;
  business: boolean;
  consentDays: number | null;
  beta: boolean;
};

export function toAspspRow(aspsp: Aspsp): AspspRow {
  const types = aspsp.psu_types ?? [];
  const seconds = aspsp.maximum_consent_validity;
  return {
    name: aspsp.name,
    personal: types.includes("personal"),
    business: types.includes("business"),
    consentDays: typeof seconds === "number" && seconds > 0 ? Math.floor(seconds / 86_400) : null,
    beta: Boolean(aspsp.beta),
  };
}

/** Rows sorted by name, one per bank name (the API repeats a bank once per PSU type). */
export function summarizeAspsps(aspsps: Aspsp[]): AspspRow[] {
  const byName = new Map<string, AspspRow>();
  for (const row of aspsps.map(toAspspRow)) {
    const seen = byName.get(row.name);
    if (!seen) {
      byName.set(row.name, row);
      continue;
    }
    byName.set(row.name, {
      ...seen,
      personal: seen.personal || row.personal,
      business: seen.business || row.business,
      consentDays: Math.max(seen.consentDays ?? 0, row.consentDays ?? 0) || null,
      beta: seen.beta && row.beta,
    });
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, "it"));
}

/** For each priority bank, the matching rows (empty = not available). */
export function matchPriorityBanks(rows: AspspRow[], priority = PRIORITY_BANKS): Record<string, AspspRow[]> {
  const result: Record<string, AspspRow[]> = {};
  for (const [label, pattern] of Object.entries(priority)) result[label] = rows.filter((row) => pattern.test(row.name));
  return result;
}
