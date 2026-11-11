// Filters of Analisi > Statistiche, read from the URL: account (?conto) and period length (?mesi).
export const PERIODS = [
  { value: "3", label: "3 mesi" },
  { value: "6", label: "6 mesi" },
  { value: "12", label: "12 mesi" },
] as const;

export type Period = (typeof PERIODS)[number]["value"];

type Param = string | string[] | undefined;
const first = (v: Param) => (Array.isArray(v) ? v[0] : v);

export function periodParam(v: Param): Period {
  return PERIODS.find((p) => p.value === first(v))?.value ?? "6";
}

/** Selected account, only when it is one of the visible ones; null = all accounts. */
export function accountParam(v: Param, accountIds: string[]): string | null {
  const id = first(v);
  return id && accountIds.includes(id) ? id : null;
}
