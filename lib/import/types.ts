// Shared types of the statement import (CSV/XLSX -> transaction drafts).
import type { ISODate } from "../domain/types";

/** Raw cell from a CSV (always string) or an XLSX sheet. */
export type Cell = string | number | Date | null;
export type Grid = Cell[][];

/** Column indexes (0-based) chosen by the user or a bank preset. */
export interface ColumnMapping {
  /** 0-based index of the header row; data starts right after it. */
  headerRow: number;
  date: number;
  description: number;
  /** Extra columns appended to the description (e.g. "Causale" + "Dettagli"). */
  extraDescription?: number[];
  amount:
    | { mode: "signed"; column: number; invert?: boolean }
    | { mode: "split"; inflow: number; outflow: number };
  category?: number;
  /** Order of day and month in textual dates; ISO dates are always recognised. */
  dateOrder?: "dmy" | "mdy";
}

export interface ImportDraft {
  /** 1-based row number in the file, shown to the user. */
  line: number;
  bookedOn: ISODate;
  /** Signed: negative = money out. */
  amountCents: number;
  description: string;
  category: string | null;
}

export interface SkippedRow {
  line: number;
  reason: string;
}

export interface MappedRows {
  drafts: ImportDraft[];
  skipped: SkippedRow[];
}
