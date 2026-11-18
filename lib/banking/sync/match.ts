// Decides what each bank movement does to MonetIO: nothing (already synced), confirms a movement
// already recorded (typically booked by a rule with an estimated amount), creates a new one, or
// goes to the "Da rivedere" queue when the evidence is not conclusive.
import { normalizeDescription } from "../../import/dedup.ts";
import type { ISODate } from "../../domain/types.ts";
import type { BankMovement } from "./normalize.ts";

export type Candidate = {
  id: string;
  bookedOn: ISODate;
  amountCents: number;
  description: string;
  /** Booked by a recurring rule or a contribution: its amount may be an estimate. */
  fromRule: boolean;
  /** Bank reference already attached by a previous sync; null when never reconciled. */
  bankRef: string | null;
};

export type ReviewReason = "amount_differs" | "possible_duplicate" | "ambiguous";

export type Decision =
  | { type: "skip"; movement: BankMovement }
  | { type: "reconcile"; movement: BankMovement; transactionId: string; amountChanged: boolean }
  | { type: "insert"; movement: BankMovement; categoryId?: string }
  | { type: "review"; movement: BankMovement; reason: ReviewReason; candidateId: string | null };

/** Days a rule booking may sit from the real bank date (weekends, value dates). */
export const RULE_WINDOW_DAYS = 5;
/** Days for a manual or imported movement recorded on a slightly different date. */
export const OTHER_WINDOW_DAYS = 2;
/** Relative gap still treated as "the same bill with a different amount" for rule bookings. */
export const AMOUNT_TOLERANCE = 0.2;

const DAY_MS = 86_400_000;
const dayGap = (a: ISODate, b: ISODate) => Math.abs(Date.parse(a) - Date.parse(b)) / DAY_MS;

function closest(movement: BankMovement, list: Candidate[]): { best: Candidate; tie: boolean } | null {
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => dayGap(a.bookedOn, movement.bookedOn) - dayGap(b.bookedOn, movement.bookedOn));
  const tie = sorted.length > 1 && dayGap(sorted[0].bookedOn, movement.bookedOn) === dayGap(sorted[1].bookedOn, movement.bookedOn);
  return { best: sorted[0], tie };
}

/**
 * One decision per movement; every candidate is used at most once across the batch.
 * `knownRefs`: references already handled elsewhere (e.g. waiting in the review queue).
 */
export function matchMovements(movements: BankMovement[], candidates: Candidate[], knownRefs: Iterable<string> = []): Decision[] {
  const synced = new Set([...candidates.map((c) => c.bankRef).filter((r): r is string => !!r), ...knownRefs]);
  const open = candidates.filter((c) => !c.bankRef);
  const used = new Set<string>();
  const decisions: Decision[] = [];

  for (const m of movements) {
    if (synced.has(m.ref)) {
      decisions.push({ type: "skip", movement: m });
      continue;
    }
    synced.add(m.ref);
    const free = open.filter((c) => !used.has(c.id) && Math.sign(c.amountCents) === Math.sign(m.amountCents));
    const desc = normalizeDescription(m.description);

    // Same amount: a rule booking nearby, or a manual/imported one with the same text or day.
    const exact = free.filter(
      (c) =>
        c.amountCents === m.amountCents &&
        (c.fromRule
          ? dayGap(c.bookedOn, m.bookedOn) <= RULE_WINDOW_DAYS
          : dayGap(c.bookedOn, m.bookedOn) <= OTHER_WINDOW_DAYS && (normalizeDescription(c.description) === desc || c.bookedOn === m.bookedOn)),
    );
    const hit = closest(m, exact);
    if (hit && !hit.tie) {
      used.add(hit.best.id);
      decisions.push({ type: "reconcile", movement: m, transactionId: hit.best.id, amountChanged: false });
      continue;
    }
    if (hit?.tie) {
      decisions.push({ type: "review", movement: m, reason: "ambiguous", candidateId: null });
      continue;
    }

    // A rule booking nearby with a different amount (bill higher or lower than estimated).
    const near = closest(
      m,
      free.filter(
        (c) =>
          c.fromRule &&
          dayGap(c.bookedOn, m.bookedOn) <= RULE_WINDOW_DAYS &&
          Math.abs(c.amountCents - m.amountCents) <= Math.abs(c.amountCents) * AMOUNT_TOLERANCE,
      ),
    );
    if (near) {
      used.add(near.best.id);
      decisions.push({ type: "review", movement: m, reason: "amount_differs", candidateId: near.best.id });
      continue;
    }

    // Same amount, close date, different text: maybe entered by hand with another description.
    const dup = closest(
      m,
      free.filter((c) => !c.fromRule && c.amountCents === m.amountCents && dayGap(c.bookedOn, m.bookedOn) <= OTHER_WINDOW_DAYS + 1),
    );
    if (dup) {
      used.add(dup.best.id);
      decisions.push({ type: "review", movement: m, reason: "possible_duplicate", candidateId: dup.best.id });
      continue;
    }

    decisions.push({ type: "insert", movement: m });
  }
  return decisions;
}
