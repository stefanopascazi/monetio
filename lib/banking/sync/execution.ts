// Execution date of bank movements (#133). Banks date movements when they book them, often days after
// a card payment. Before booking, the payment already shows: as a pending item, or (Trade Republic)
// only as a drop of the available balance. A per-account ledger of pending outflows remembers the day
// each one was first seen; the booked movement then takes that day as its date.
import { addDays, daysBetween } from "../../domain/dates.ts";
import type { PendingItem } from "../../domain/pending.ts";
import type { ISODate } from "../../domain/types.ts";
import type { Decision } from "./match.ts";

/** Outflow seen before booking: the day first seen (or the bank's own date) and its amount (negative). */
export type LedgerEntry = { on: ISODate; amountCents: number };

/**
 * `offsetCents`: lasting gap between available and booked balance that no recent payment explains
 * (e.g. MonetIO missing an old movement); never used to date anything.
 */
export type PendingLedger = { offsetCents: number; entries: LedgerEntry[] };

export const EMPTY_LEDGER: PendingLedger = { offsetCents: 0, entries: [] };

/** Days a card payment may take to be booked: older entries are folded into the offset. */
export const MAX_BOOKING_LAG_DAYS = 5;
/** Entries kept at most, oldest dropped first. */
export const MAX_LEDGER_ENTRIES = 50;

const byDay = (a: LedgerEntry, b: LedgerEntry) => a.on.localeCompare(b.on);

/**
 * New bank outflows take the day of the oldest matching ledger entry within the booking lag: the same
 * amount, else part of a larger entry (several payments seen together as one balance drop).
 * Returns the decisions and what is left of the ledger.
 */
export function assignExecutionDates(decisions: Decision[], ledger: PendingLedger): { decisions: Decision[]; ledger: PendingLedger } {
  const entries = ledger.entries.map((e) => ({ ...e })).sort(byDay);
  const out = decisions.map((d) => {
    if (d.type !== "insert" || d.movement.amountCents >= 0) return d;
    const m = d.movement;
    const usable = entries.filter((e) => e.on <= m.bookedOn && daysBetween(e.on, m.bookedOn) <= MAX_BOOKING_LAG_DAYS);
    const exact = usable.find((e) => e.amountCents === m.amountCents);
    const larger = exact ?? usable.find((e) => e.amountCents < m.amountCents);
    if (!larger) return d;
    if (exact) entries.splice(entries.indexOf(exact), 1);
    else larger.amountCents -= m.amountCents;
    return larger.on < m.bookedOn ? { ...d, executedOn: larger.on } : d;
  });
  return { decisions: out, ledger: { offsetCents: ledger.offsetCents, entries } };
}

/** Removes `cents` (positive) of outflow, an entry of exactly that amount first, else the newest ones. */
function release(entries: LedgerEntry[], cents: number): { entries: LedgerEntry[]; left: number } {
  const list = entries.map((e) => ({ ...e }));
  const exact = list.findLastIndex((e) => e.amountCents === -cents);
  if (exact >= 0) {
    list.splice(exact, 1);
    return { entries: list, left: 0 };
  }
  let left = cents;
  while (left > 0 && list.length) {
    const last = list[list.length - 1];
    if (-last.amountCents <= left) {
      left += last.amountCents;
      list.pop();
    } else {
      last.amountCents += left;
      left = 0;
    }
  }
  return { entries: list, left };
}

export type LedgerInput = {
  /** Ledger left after this sync's movements took their dates. */
  ledger: PendingLedger;
  /** Pending items listed by the bank in this sync. */
  pending: PendingItem[];
  /** Available minus booked balance after this sync (negative = outflows not booked yet); null when unknown. */
  gapCents: number | null;
  today: ISODate;
};

/** Ledger to keep until the next sync. */
export function nextLedger({ ledger, pending, gapCents, today }: LedgerInput): PendingLedger {
  const listed = pending.filter((p) => p.amountCents < 0);
  // Banks listing pending items give their own dates: they replace whatever was inferred.
  if (listed.length) return { offsetCents: 0, entries: listed.map((p) => ({ on: p.date, amountCents: p.amountCents })).sort(byDay).slice(-MAX_LEDGER_ENTRIES) };

  let offset = ledger.offsetCents;
  let entries = ledger.entries.map((e) => ({ ...e }));
  if (gapCents !== null) {
    // Part of the gap explained by recent payments. Above the tracked outflows (manual entries, a fixed
    // mismatch, incoming money) it releases entries first, then the offset.
    const target = gapCents - offset;
    const sum = entries.reduce((s, e) => s + e.amountCents, 0);
    if (target < sum) entries.push({ on: today, amountCents: target - sum });
    else if (target > sum) {
      const released = release(entries, target - sum);
      entries = released.entries;
      offset = Math.min(offset + released.left, 0);
    }
    // A gap back to zero or above leaves nothing to explain.
    if (gapCents >= 0) offset = 0;
  }
  // Too old to be a card payment waiting for booking: a lasting mismatch, not a date to give.
  const oldest = addDays(today, -MAX_BOOKING_LAG_DAYS);
  for (const e of entries) if (e.on < oldest) offset += e.amountCents;
  entries = entries.filter((e) => e.on >= oldest).sort(byDay).slice(-MAX_LEDGER_ENTRIES);
  return { offsetCents: offset, entries };
}

/** Ledger read from the database; anything malformed counts as empty. */
export function parseLedger(raw: unknown): PendingLedger {
  if (!raw || typeof raw !== "object") return EMPTY_LEDGER;
  const r = raw as { offsetCents?: unknown; entries?: unknown };
  const entries = Array.isArray(r.entries)
    ? r.entries.filter(
        (e): e is LedgerEntry =>
          !!e && typeof e === "object" && typeof (e as LedgerEntry).on === "string" && /^\d{4}-\d{2}-\d{2}$/.test((e as LedgerEntry).on) && Number.isInteger((e as LedgerEntry).amountCents) && (e as LedgerEntry).amountCents < 0,
      )
    : [];
  return { offsetCents: Number.isInteger(r.offsetCents) ? Math.min(Number(r.offsetCents), 0) : 0, entries };
}
