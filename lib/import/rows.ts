// Database rows for imported drafts.
import type { Category } from "../domain/types";
import { normalizeDescription, withImportRefs } from "./dedup";
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
}

export function importRows(drafts: ImportDraft[], t: ImportTarget) {
  return withImportRefs(t.accountId, drafts).map((d) => ({
    household_id: t.householdId,
    account_id: t.accountId,
    category_id: matchCategory(d.category, d.amountCents, t.categories),
    kind: d.amountCents > 0 ? "income" : "expense",
    status: "booked",
    source: "import",
    amount_cents: d.amountCents,
    booked_on: d.bookedOn,
    description: d.description,
    import_ref: d.importRef,
    import_batch_id: t.batchId ?? null,
    // Imports carry no author, like the sheet import.
    created_by: null,
  }));
}
