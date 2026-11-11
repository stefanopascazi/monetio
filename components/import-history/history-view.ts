// Display rows of the import history.
import { dateLabel, todayISO } from "@/lib/domain/dates";
import type { ImportBatch } from "@/lib/import/batch";

export interface BatchView {
  id: string;
  fileName: string;
  bank: string | null;
  accountName: string;
  /** Day of the import, Rome time. */
  importedOn: string;
  period: string | null;
  rowCount: number;
  totalCents: number;
  undone: boolean;
  undoneOn: string | null;
}

export function periodLabel(first: string | null, last: string | null): string | null {
  if (!first || !last) return null;
  return first === last ? dateLabel(first) : `dal ${dateLabel(first)} al ${dateLabel(last)}`;
}

export function toBatchView(b: ImportBatch, accountNames: ReadonlyMap<string, string>): BatchView {
  return {
    id: b.id,
    fileName: b.fileName,
    bank: b.bank,
    accountName: accountNames.get(b.accountId) ?? "Conto non disponibile",
    importedOn: dateLabel(todayISO(new Date(b.createdAt))),
    period: periodLabel(b.firstDate, b.lastDate),
    rowCount: b.rowCount,
    totalCents: b.totalCents,
    undone: b.undoneAt != null,
    undoneOn: b.undoneAt ? dateLabel(todayISO(new Date(b.undoneAt))) : null,
  };
}
