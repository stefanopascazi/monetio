// Transfer detection. A draft naming another household account (its IBAN or card digits in the
// description) is a giroconto for sure; otherwise a new draft whose opposite amount was booked on another
// household account a few days apart most likely is (e.g. Cherry -800 "Ricarica" / Revolut +800).
import { extractCardLast4, extractIbans } from "../banking/identifiers";
import { daysBetween } from "../domain/dates";
import type { ISODate } from "../domain/types";
import type { DraftStatus } from "./classify";

/** Movement on another visible account that could be the other side of a transfer. */
export interface TransferCandidate {
  id: string;
  accountId: string;
  accountName: string;
  bookedOn: ISODate;
  amountCents: number;
  description: string;
  /** Reused on the imported side, so both rows of the giroconto share it. */
  categoryId: string | null;
}

export const TRANSFER_WINDOW_DAYS = 3;

/** Household account named by a draft's description. */
export interface IdentifiedAccount {
  id: string;
  name: string;
  via: "iban" | "card";
}

/** Row of match_household_accounts: the account owning one of the identifiers searched. */
export interface AccountMatch {
  accountId: string;
  iban: string | null;
  card: string | null;
}

/** Identifiers to look up for the drafts, deduplicated. */
export function draftIdentifiers(drafts: { description: string }[]): { ibans: string[]; cards: string[] } {
  const ibans = new Set<string>();
  const cards = new Set<string>();
  for (const d of drafts) {
    extractIbans(d.description).forEach((i) => ibans.add(i));
    extractCardLast4(d.description).forEach((c) => cards.add(c));
  }
  return { ibans: [...ibans], cards: [...cards] };
}

/**
 * Other household account named by each draft: an IBAN wins over card digits. The imported account's own
 * IBAN (the debtor of a direct debit) is ignored, and card digits shared by several accounts are ambiguous.
 */
export function identifyAccounts(
  drafts: { description: string }[],
  ownAccountId: string,
  matches: AccountMatch[],
  names: ReadonlyMap<string, string>,
): (IdentifiedAccount | null)[] {
  const byIban = new Map<string, string>();
  const byCard = new Map<string, Set<string>>();
  for (const m of matches) {
    if (m.accountId === ownAccountId) continue;
    if (m.iban) byIban.set(m.iban, m.accountId);
    if (m.card) byCard.set(m.card, (byCard.get(m.card) ?? new Set<string>()).add(m.accountId));
  }
  const named = (id: string, via: IdentifiedAccount["via"]): IdentifiedAccount => ({ id, name: names.get(id) ?? "Altro conto", via });
  return drafts.map((d) => {
    const iban = extractIbans(d.description).find((i) => byIban.has(i));
    if (iban) return named(byIban.get(iban)!, "iban");
    const card = extractCardLast4(d.description).find((c) => byCard.get(c)?.size === 1);
    return card ? named([...byCard.get(card)!][0], "card") : null;
  });
}

/** Nearest unused candidate with the opposite amount within the window, optionally on one account only. */
function nearestCandidate(d: { bookedOn: ISODate; amountCents: number }, candidates: TransferCandidate[], used: Set<string>, windowDays: number, accountId?: string) {
  let best: TransferCandidate | null = null;
  let bestGap = Infinity;
  for (const c of candidates) {
    if (used.has(c.id) || c.amountCents !== -d.amountCents || (accountId && c.accountId !== accountId)) continue;
    const gap = Math.abs(daysBetween(c.bookedOn, d.bookedOn));
    if (gap <= windowDays && gap < bestGap) {
      best = c;
      bestGap = gap;
    }
  }
  return best;
}

/**
 * Upgrades "new" statuses to giroconti. Drafts naming another account go first: they pair with a movement
 * on that account or, when none is booked yet, ask for its other side to be created. The rest pair by
 * amount and date. Each candidate is used once, nearest date first.
 */
export function detectTransfers(
  drafts: { bookedOn: ISODate; amountCents: number }[],
  statuses: DraftStatus[],
  candidates: TransferCandidate[],
  identified: (IdentifiedAccount | null)[] = [],
  windowDays = TRANSFER_WINDOW_DAYS,
): DraftStatus[] {
  const used = new Set<string>();
  const byAccount = statuses.map((status, i): DraftStatus => {
    const account = identified[i];
    if (status.kind !== "new" || !account) return status;
    const match = nearestCandidate(drafts[i], candidates, used, windowDays, account.id);
    if (!match) return { kind: "transferNew", account: { id: account.id, name: account.name }, via: account.via };
    used.add(match.id);
    return { kind: "transfer", match, via: account.via };
  });
  return byAccount.map((status, i) => {
    if (status.kind !== "new") return status;
    const match = nearestCandidate(drafts[i], candidates, used, windowDays);
    if (!match) return status;
    used.add(match.id);
    return { kind: "transfer", match };
  });
}

/** Giroconto chosen in the browser: pair with an existing movement, or create the other side on an account. */
export type TransferLink = { line: number; transactionId: string } | { line: number; accountId: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Links chosen in the browser; invalid entries make the whole list invalid (null). */
export function parseLinks(input: unknown): TransferLink[] | null {
  if (input == null) return [];
  if (!Array.isArray(input)) return null;
  const out: TransferLink[] = [];
  for (const v of input) {
    const { line, transactionId, accountId } = (v ?? {}) as Record<string, unknown>;
    if (!Number.isInteger(line)) return null;
    if (typeof transactionId === "string" && UUID_RE.test(transactionId) && accountId === undefined) out.push({ line: line as number, transactionId });
    else if (typeof accountId === "string" && UUID_RE.test(accountId) && transactionId === undefined) out.push({ line: line as number, accountId });
    else return null;
  }
  return out;
}

/** Other side of an imported giroconto: an existing movement to link, or a new row to create on `accountId`. */
export interface TransferTarget {
  accountId: string;
  categoryId: string | null;
  existingId: string | null;
}

/**
 * Keeps only the links the server's own detection confirms (same line, same counterpart movement or account),
 * so a stale or forged link never turns a movement into a transfer.
 */
export function confirmedLinks(links: TransferLink[], drafts: { line: number }[], statuses: DraftStatus[]): Map<number, TransferTarget> {
  const out = new Map<number, TransferTarget>();
  const wanted = new Map(links.map((l) => [l.line, l]));
  drafts.forEach((d, i) => {
    const s = statuses[i];
    const link = wanted.get(d.line);
    if (!link) return;
    if (s.kind === "transfer" && "transactionId" in link && link.transactionId === s.match.id) {
      out.set(d.line, { accountId: s.match.accountId, categoryId: s.match.categoryId, existingId: s.match.id });
    } else if (s.kind === "transferNew" && "accountId" in link && link.accountId === s.account.id) {
      out.set(d.line, { accountId: s.account.id, categoryId: null, existingId: null });
    }
  });
  return out;
}
