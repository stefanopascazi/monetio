// Tabs of the "Banche collegate" page: one per consent, plus the app and new-link tab.
import type { BankConnection } from "./connections";
import type { BankReview } from "./reviews";

export const SETUP_TAB = "collegamento";

/** A bank just linked opens on its tab (the newest); a failed link on the setup tab; else the first bank. */
export function defaultBankTab(connections: Pick<BankConnection, "id">[], outcome?: string): string {
  if (!connections.length) return SETUP_TAB;
  if (!outcome) return connections[0].id;
  return outcome === "collegata" ? connections[connections.length - 1].id : SETUP_TAB;
}

/** "Da rivedere" items grouped by the consent feeding their account; the rest (e.g. another member's bank) apart. */
export function reviewsByConnection(
  connections: Pick<BankConnection, "id" | "accounts">[],
  reviews: BankReview[],
): { byConnection: Record<string, BankReview[]>; other: BankReview[] } {
  const owner = new Map<string, string>();
  for (const c of connections) for (const a of c.accounts) if (a.accountId && !owner.has(a.accountId)) owner.set(a.accountId, c.id);
  const byConnection: Record<string, BankReview[]> = {};
  const other: BankReview[] = [];
  for (const r of reviews) {
    const id = owner.get(r.accountId);
    if (id) (byConnection[id] ??= []).push(r);
    else other.push(r);
  }
  return { byConnection, other };
}
