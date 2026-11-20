// Bank sync batches (#88): what each sync wrote, so the owner can undo it.

export type BankSyncBatchKind = "worker" | "preview";

export type BankSyncBatch = {
  id: string;
  accountId: string;
  kind: BankSyncBatchKind;
  inserted: number;
  reconciled: number;
  review: number;
  createdAt: string;
  undoneAt: string | null;
};

type Row = {
  id: string;
  account_id: string;
  kind: string;
  inserted: number | string;
  reconciled: number | string;
  review: number | string;
  created_at: string;
  undone_at: string | null;
};

/** Batches shown per account on the "Banche" page. */
export const RECENT_BATCHES = 5;

export function mapBankSyncBatch(row: Row): BankSyncBatch {
  return {
    id: row.id,
    accountId: row.account_id,
    kind: row.kind === "preview" ? "preview" : "worker",
    inserted: Number(row.inserted),
    reconciled: Number(row.reconciled),
    review: Number(row.review),
    createdAt: row.created_at,
    undoneAt: row.undone_at,
  };
}

/** Only the newest batch still active can be undone (newer ones first, so they never overlap). */
export function undoableBatchId(batches: BankSyncBatch[]): string | null {
  const active = batches.filter((b) => !b.undoneAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return active[0]?.id ?? null;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "3 nuovi · 1 abbinato · 2 da rivedere", or a note when the batch wrote nothing. */
export function batchSummary(b: Pick<BankSyncBatch, "inserted" | "reconciled" | "review">): string {
  const parts = [
    b.inserted && plural(b.inserted, "nuovo", "nuovi"),
    b.reconciled && plural(b.reconciled, "abbinato", "abbinati"),
    b.review && `${b.review} da rivedere`,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Nessun movimento";
}

export const BATCH_KIND_LABEL: Record<BankSyncBatchKind, string> = {
  preview: "Primo import",
  worker: "Aggiornamento automatico",
};

/** Confirmation text: undoing the first import also brings the preview back. */
export function undoMessage(kind: BankSyncBatchKind): string {
  const base = "Cancello i movimenti nuovi, tolgo gli abbinamenti ripristinando i valori precedenti e rimuovo le voci da rivedere.";
  return kind === "preview" ? `${base} Il conto tornerà all'anteprima del primo import.` : `${base} Il prossimo aggiornamento rileggerà questi giorni.`;
}

// Batch details: the movements a batch wrote, to check it before undoing.

export type BatchMovement = { id: string; bookedOn: string; amountCents: number; description: string };

export type BatchChange = BatchMovement & {
  status: "booked" | "planned";
  prevAmountCents: number;
  prevBookedOn: string;
  prevStatus: "booked" | "planned";
};

export type BatchReviewState = "open" | "excluded" | "added" | "matched" | "ignored";

export type BatchReviewItem = BatchMovement & { state: BatchReviewState };

export type BankSyncBatchDetail = { inserted: BatchMovement[]; reconciled: BatchChange[]; reviews: BatchReviewItem[] };

type MovementRow = { id: string; booked_on: string; amount_cents: number | string; description: string };
type ChangeRow = {
  prev_amount_cents: number | string;
  prev_booked_on: string;
  prev_status: string;
  transaction: (MovementRow & { status: string; parent_transaction_id: string | null }) | null;
};
type ReviewRow = MovementRow & { reason: string; resolution: string | null };

const movement = (r: MovementRow): BatchMovement => ({ id: r.id, bookedOn: r.booked_on, amountCents: Number(r.amount_cents), description: r.description });
const status = (s: string): "booked" | "planned" => (s === "planned" ? "planned" : "booked");

/** Rows of the three batch queries to the detail shown; fee rows stay out (they follow their movement). */
export function mapBatchDetail(rows: { inserted: MovementRow[]; changes: ChangeRow[]; reviews: ReviewRow[] }): BankSyncBatchDetail {
  return {
    inserted: rows.inserted.map(movement),
    reconciled: rows.changes.flatMap((c) =>
      c.transaction && !c.transaction.parent_transaction_id
        ? [
            {
              ...movement(c.transaction),
              status: status(c.transaction.status),
              prevAmountCents: Number(c.prev_amount_cents),
              prevBookedOn: c.prev_booked_on,
              prevStatus: status(c.prev_status),
            },
          ]
        : [],
    ),
    reviews: rows.reviews.map((r) => ({
      ...movement(r),
      state: r.reason === "excluded" ? "excluded" : r.resolution === "added" || r.resolution === "matched" || r.resolution === "ignored" ? r.resolution : "open",
    })),
  };
}

export const REVIEW_STATE_LABEL: Record<BatchReviewState, string> = {
  open: "Da rivedere",
  excluded: "Escluso",
  added: "Aggiunto",
  matched: "Abbinato",
  ignored: "Ignorato",
};

/** What undo would put back on a changed movement; empty when only the bank reference was added. */
export function changeNotes(c: BatchChange): { status: boolean; bookedOn: boolean; amount: boolean } {
  return { status: c.prevStatus !== c.status, bookedOn: c.prevBookedOn !== c.bookedOn, amount: c.prevAmountCents !== c.amountCents };
}
