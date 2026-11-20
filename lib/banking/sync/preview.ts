// First-sync preview: what the bank would bring in, grouped for the owner, and the payload written
// once they confirm (unselected movements are remembered as excluded, so no later sync proposes them).
import type { ISODate } from "../../domain/types.ts";
import { isUUID } from "../../forms/parse.ts";
import { isIdentical } from "../../import/matches.ts";
import type { Decision, ReviewReason } from "./match.ts";

export type PreviewGroup = "new" | "review" | "matched" | "known";

export type PreviewItem = {
  ref: string;
  bookedOn: ISODate;
  amountCents: number;
  description: string;
  group: PreviewGroup;
  reason: ReviewReason | null;
  /** Category of a new movement: the account match, or the owner's pick. */
  categoryId: string | null;
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
      categoryId: d.type === "insert" ? (d.categoryId ?? null) : null,
    }))
    .sort((a, b) => b.bookedOn.localeCompare(a.bookedOn));
}

/**
 * Category picked for a new movement. A category also goes to identical new movements that had none
 * or the same category as the picked one before; clearing it touches only that movement.
 */
export function withPick<T extends Pick<PreviewItem, "ref" | "description" | "amountCents" | "group" | "categoryId">>(items: T[], ref: string, categoryId: string | null): T[] {
  const source = items.find((i) => i.ref === ref && i.group === "new");
  if (!source) return items;
  const before = source.categoryId;
  return items.map((i) => {
    if (i === source) return { ...i, categoryId };
    if (categoryId === null || i.group !== "new" || !isIdentical(i, source)) return i;
    return i.categoryId === null || i.categoryId === before ? { ...i, categoryId } : i;
  });
}

/** Movements the owner can choose: new ones and those that would go to "Da rivedere". */
export const isSelectable = (item: Pick<PreviewItem, "group">) => item.group === "new" || item.group === "review";

/** Selected by default: every choosable movement. */
export const defaultSelection = (items: PreviewItem[]) => items.filter(isSelectable).map((i) => i.ref);

/**
 * What confirm_bank_sync writes: chosen movements as decided, the others excluded, known ones skipped.
 * `categories` overrides the category of new movements by ref (the owner's picks).
 */
export function confirmItems(decisions: Decision[], selected: Iterable<string>, categories?: ReadonlyMap<string, string | null>): ConfirmItem[] {
  const chosen = new Set(selected);
  const out: ConfirmItem[] = [];
  for (const d of decisions) {
    const m = d.movement;
    const base = { ref: m.ref, booked_on: m.bookedOn, amount_cents: m.amountCents, description: m.description };
    if (d.type === "reconcile") out.push({ ...base, type: "reconcile", transaction_id: d.transactionId });
    else if (d.type === "skip") continue;
    else if (!chosen.has(m.ref)) out.push({ ...base, type: "exclude" });
    else if (d.type === "insert") out.push({ ...base, type: "insert", category_id: categories?.has(m.ref) ? categories.get(m.ref)! : (d.categoryId ?? null) });
    else out.push({ ...base, type: "review", reason: d.reason, candidate_id: d.candidateId });
  }
  return out;
}

/** Sum of the chosen movements that become booked right away (reviews wait for a decision). */
export function selectedTotal(items: PreviewItem[], selected: ReadonlySet<string>): number {
  return items.reduce((s, i) => (i.group === "new" && selected.has(i.ref) ? s + i.amountCents : s), 0);
}

export type CategoryPick = [ref: string, categoryId: string | null];

/**
 * Replays the owner's picks on the server, in order, keeping only categories valid for the movement.
 * Returns the category of every new movement by ref and the choices to remember for the account.
 */
export function applyPicks(items: PreviewItem[], picks: CategoryPick[], valid: (categoryId: string | null, amountCents: number) => string | null) {
  let out = items;
  const remembered = new Map<string, { description: string; amountCents: number; categoryId: string }>();
  for (const [ref, raw] of picks) {
    const item = out.find((i) => i.ref === ref && i.group === "new");
    if (!item) continue;
    const categoryId = valid(raw, item.amountCents);
    out = withPick(out, ref, categoryId);
    if (categoryId) remembered.set(ref, { description: item.description, amountCents: item.amountCents, categoryId });
    else remembered.delete(ref);
  }
  return { categories: new Map(out.filter((i) => i.group === "new").map((i) => [i.ref, i.categoryId])), remembered };
}

/** Picks from the browser: [ref, categoryId | null] pairs, or null when malformed. */
export function parsePicks(input: unknown): CategoryPick[] | null {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > 5000) return null;
  for (const p of input) {
    if (!Array.isArray(p) || p.length !== 2 || typeof p[0] !== "string" || p[0].length > 120) return null;
    if (p[1] !== null && (typeof p[1] !== "string" || !isUUID(p[1]))) return null;
  }
  return input as CategoryPick[];
}
