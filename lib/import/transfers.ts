// Transfer detection: a new draft whose opposite amount was booked on another household account a few days
// apart is most likely the other side of a giroconto (e.g. Cherry -800 "Ricarica" / Revolut +800).
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

/** Upgrades "new" statuses to "transfer" when a candidate matches; each candidate is used once, nearest date first. */
export function detectTransfers(
  drafts: { bookedOn: ISODate; amountCents: number }[],
  statuses: DraftStatus[],
  candidates: TransferCandidate[],
  windowDays = TRANSFER_WINDOW_DAYS,
): DraftStatus[] {
  const used = new Set<string>();
  return statuses.map((status, i) => {
    if (status.kind !== "new") return status;
    const d = drafts[i];
    let best: TransferCandidate | null = null;
    let bestGap = Infinity;
    for (const c of candidates) {
      if (used.has(c.id) || c.amountCents !== -d.amountCents) continue;
      const gap = Math.abs(daysBetween(c.bookedOn, d.bookedOn));
      if (gap <= windowDays && gap < bestGap) {
        best = c;
        bestGap = gap;
      }
    }
    if (!best) return status;
    used.add(best.id);
    return { kind: "transfer", match: best };
  });
}

export interface TransferLink {
  line: number;
  transactionId: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Links chosen in the browser; invalid entries make the whole list invalid (null). */
export function parseLinks(input: unknown): TransferLink[] | null {
  if (input == null) return [];
  if (!Array.isArray(input)) return null;
  const out: TransferLink[] = [];
  for (const v of input) {
    const { line, transactionId } = (v ?? {}) as Record<string, unknown>;
    if (!Number.isInteger(line) || typeof transactionId !== "string" || !UUID_RE.test(transactionId)) return null;
    out.push({ line: line as number, transactionId });
  }
  return out;
}

/**
 * Keeps only the links the server's own detection confirms (same line, same counterpart movement),
 * so a stale or forged link never turns a movement into a transfer.
 */
export function confirmedLinks(links: TransferLink[], drafts: { line: number }[], statuses: DraftStatus[]): Map<number, TransferCandidate> {
  const out = new Map<number, TransferCandidate>();
  const wanted = new Map(links.map((l) => [l.line, l.transactionId]));
  drafts.forEach((d, i) => {
    const s = statuses[i];
    if (s.kind === "transfer" && wanted.get(d.line) === s.match.id) out.set(d.line, s.match);
  });
  return out;
}
