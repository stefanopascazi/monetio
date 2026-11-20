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
