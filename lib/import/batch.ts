// Import batches: metadata sent with an import, stats of the inserted rows, mapping for the history.
import type { ISODate } from "../domain/types";

export interface ImportMeta {
  fileName: string;
  bank: string | null;
}

/** File name and bank from the browser, trimmed and capped; null when unusable. */
export function parseImportMeta(input: unknown): ImportMeta | null {
  if (!input || typeof input !== "object") return null;
  const { fileName, bank } = input as Record<string, unknown>;
  if (typeof fileName !== "string" || !fileName.trim()) return null;
  if (bank != null && typeof bank !== "string") return null;
  return { fileName: fileName.trim().slice(0, 200), bank: bank?.trim().slice(0, 50) || null };
}

export interface BatchStats {
  rowCount: number;
  totalCents: number;
  firstDate: ISODate | null;
  lastDate: ISODate | null;
}

export function batchStats(rows: { amountCents: number; bookedOn: ISODate }[]): BatchStats {
  const dates = rows.map((r) => r.bookedOn).sort();
  return {
    rowCount: rows.length,
    totalCents: rows.reduce((s, r) => s + r.amountCents, 0),
    firstDate: dates[0] ?? null,
    lastDate: dates[dates.length - 1] ?? null,
  };
}

export interface ImportBatch extends BatchStats {
  id: string;
  accountId: string;
  fileName: string;
  bank: string | null;
  createdAt: string;
  undoneAt: string | null;
}

export function mapBatch(r: Record<string, unknown>): ImportBatch {
  return {
    id: String(r.id),
    accountId: String(r.account_id),
    fileName: String(r.file_name),
    bank: (r.bank as string | null) ?? null,
    rowCount: Number(r.row_count),
    totalCents: Number(r.total_cents),
    firstDate: (r.first_date as string | null) ?? null,
    lastDate: (r.last_date as string | null) ?? null,
    createdAt: String(r.created_at),
    undoneAt: (r.undone_at as string | null) ?? null,
  };
}
