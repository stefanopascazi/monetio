// Database rows for imported drafts.
import type { Category } from "../domain/types";
import { normalizeDescription, withImportRefs } from "./dedup";
import type { TransferCandidate } from "./transfers";
import type { ImportDraft } from "./types";

/** Active category with the same (normalised) name and a compatible kind, if any. */
export function matchCategory(name: string | null, amountCents: number, categories: Category[]): string | null {
  if (!name) return null;
  const wanted = normalizeDescription(name);
  const kind = amountCents > 0 ? "income" : "expense";
  const hit = categories.find((c) => !c.archived && (c.kind === kind || c.kind === "both") && normalizeDescription(c.name) === wanted);
  return hit?.id ?? null;
}

export interface ImportTarget {
  householdId: string;
  accountId: string;
  categories: Category[];
  /** Import batch the rows belong to (Storico import). */
  batchId?: string | null;
  /** Drafts (by line) to book as the other side of an existing movement on another account. */
  transfers?: ReadonlyMap<number, TransferCandidate>;
  /** Category chosen in the preview per line (already validated; null = none). Wins over everything else. */
  categoryByLine?: ReadonlyMap<number, string | null>;
}

export function importRows(drafts: ImportDraft[], t: ImportTarget, newId: () => string = () => crypto.randomUUID()) {
  return withImportRefs(t.accountId, drafts).map((d) => {
    const link = t.transfers?.get(d.line);
    return {
      household_id: t.householdId,
      account_id: t.accountId,
      category_id: t.categoryByLine?.has(d.line) ? (t.categoryByLine.get(d.line) ?? null) : link ? link.categoryId : matchCategory(d.category, d.amountCents, t.categories),
      kind: link ? "transfer" : d.amountCents > 0 ? "income" : "expense",
      counterpart_account_id: link?.accountId ?? null,
      // The existing side joins this group after the insert (linkTransferSides).
      transfer_group_id: link ? newId() : null,
      status: "booked",
      source: "import",
      amount_cents: d.amountCents,
      booked_on: d.bookedOn,
      description: d.description,
      import_ref: d.importRef,
      import_batch_id: t.batchId ?? null,
      // Imports carry no author, like the sheet import.
      created_by: null,
    };
  });
}
