// Balance totals split by account visibility.
import type { Visibility } from "./types";

export function visibilityTotals(accounts: { visibility: Visibility; balanceCents: number }[]): Record<Visibility, number> {
  const totals: Record<Visibility, number> = { shared: 0, private: 0 };
  for (const a of accounts) totals[a.visibility] += a.balanceCents;
  return totals;
}
