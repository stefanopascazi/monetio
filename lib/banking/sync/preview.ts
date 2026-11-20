// First-sync preview: what the bank would bring in, grouped for the owner, and the payload written
// once they confirm (unselected movements are remembered as excluded, so no later sync proposes them).
import type { ISODate } from "../../domain/types.ts";
import type { Decision, ReviewReason } from "./match.ts";

export type PreviewGroup = "new" | "review" | "matched" | "known";

export type PreviewItem = {
  ref: string;
  bookedOn: ISODate;
  amountCents: number;
  description: string;
  group: PreviewGroup;
  reason: ReviewReason | null;
};

export type SyncPreview = {
  from: ISODate;
  items: PreviewItem[];
  balance: { cents: number; date: ISODate | null } | null;
};

export type ConfirmItem = {
  type: "insert" | "reconcile" | "review" | "exclude";
  ref: string;
  booked_on: ISODate;
  amount_cents: number;
  description: string;
  category_id?: string | null;
  transaction_id?: string;
  reason?: ReviewReason;
  candidate_id?: string | null;
};

const GROUP: Record<Decision["type"], PreviewGroup> = { insert: "new", review: "review", reconcile: "matched", skip: "known" };

/** Newest first: the owner checks recent movements before old ones. */
export function previewItems(decisions: Decision[]): PreviewItem[] {
  return decisions
    .map((d) => ({
      ref: d.movement.ref,
      bookedOn: d.movement.bookedOn,
      amountCents: d.movement.amountCents,
      description: d.movement.description,
      group: GROUP[d.type],
      reason: d.type === "review" ? d.reason : null,
    }))
    .sort((a, b) => b.bookedOn.localeCompare(a.bookedOn));
}

/** Movements the owner can choose: new ones and those that would go to "Da rivedere". */
export const isSelectable = (item: Pick<PreviewItem, "group">) => item.group === "new" || item.group === "review";

/** Selected by default: every choosable movement. */
export const defaultSelection = (items: PreviewItem[]) => items.filter(isSelectable).map((i) => i.ref);

/** What confirm_bank_sync writes: chosen movements as decided, the others excluded, known ones skipped. */
export function confirmItems(decisions: Decision[], selected: Iterable<string>): ConfirmItem[] {
  const chosen = new Set(selected);
  const out: ConfirmItem[] = [];
  for (const d of decisions) {
    const m = d.movement;
    const base = { ref: m.ref, booked_on: m.bookedOn, amount_cents: m.amountCents, description: m.description };
    if (d.type === "reconcile") out.push({ ...base, type: "reconcile", transaction_id: d.transactionId });
    else if (d.type === "skip") continue;
    else if (!chosen.has(m.ref)) out.push({ ...base, type: "exclude" });
    else if (d.type === "insert") out.push({ ...base, type: "insert", category_id: d.categoryId ?? null });
    else out.push({ ...base, type: "review", reason: d.reason, candidate_id: d.candidateId });
  }
  return out;
}

/** Sum of the chosen movements that become booked right away (reviews wait for a decision). */
export function selectedTotal(items: PreviewItem[], selected: ReadonlySet<string>): number {
  return items.reduce((s, i) => (i.group === "new" && selected.has(i.ref) ? s + i.amountCents : s), 0);
}
