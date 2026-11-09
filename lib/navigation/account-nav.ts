// Pure helpers for moving between accounts: switcher list, prev/next, landing target, links.
import { withQuery } from "@/lib/data/params";

export interface NavAccount {
  id: string;
  archived: boolean;
}

/** Statement params kept when switching account, so the same period stays selected. */
export const KEPT_PARAMS = ["mese", "da", "a", "proiezione"] as const;

type Params = Record<string, string | string[] | undefined>;

/** Active accounts in their order; an archived current account is appended so it stays visible. */
export function switcherAccounts<T extends NavAccount>(accounts: T[], currentId: string): T[] {
  const active = accounts.filter((a) => !a.archived);
  const current = accounts.find((a) => a.id === currentId);
  return current?.archived ? [...active, current] : active;
}

/** Neighbours of the current account in the switcher list (no wrap-around). */
export function adjacentAccounts<T extends NavAccount>(list: T[], currentId: string): { prev: T | null; next: T | null } {
  const i = list.findIndex((a) => a.id === currentId);
  if (i < 0) return { prev: null, next: null };
  return { prev: list[i - 1] ?? null, next: list[i + 1] ?? null };
}

/** Account statement link carrying over the period params only. */
export function accountHref(id: string, sp: Params = {}): string {
  const query: Record<string, string | undefined> = {};
  for (const k of KEPT_PARAMS) {
    const v = sp[k];
    query[k] = Array.isArray(v) ? v[0] : v;
  }
  return withQuery(`/conti/${id}`, query);
}

/** Account opened by the "Conti" tab: the last visited if still active, else the first active one. */
export function landingAccountId(accounts: NavAccount[], lastId: string | undefined): string | null {
  const active = accounts.filter((a) => !a.archived);
  return active.find((a) => a.id === lastId)?.id ?? active[0]?.id ?? null;
}
