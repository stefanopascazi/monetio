// Column detection and row mapping from a parsed grid to transaction drafts.
import { normalizeDescription as norm } from "./dedup";
import type { Cell, ColumnMapping, Grid, ImportDraft, MappedRows, SkippedRow } from "./types";
import { parseAmount, parseDate } from "./values";

export function cellText(cell: Cell): string {
  if (cell == null) return "";
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  return String(cell).replace(/\s+/g, " ").trim();
}

// Header keywords (normalised), most specific first. Booking date wins over value date.
const HEADERS = {
  date: ["data contabile", "data operazione", "data registrazione", "started date", "completed date", "data", "date"],
  description: ["descrizione operazione", "descrizione", "causale", "operazione", "dettagli", "description", "beneficiario"],
  amount: ["importo", "amount", "ammontare"],
  inflow: ["entrate", "accrediti", "avere", "accredito"],
  outflow: ["uscite", "addebiti", "dare", "addebito"],
  category: ["categoria", "category"],
} as const;

type Field = keyof typeof HEADERS;

/** Index of the first header matching the field, scanning keywords in priority order. */
function findColumn(headers: string[], field: Field, taken: Set<number>): number {
  for (const key of HEADERS[field]) {
    const i = headers.findIndex((h, idx) => !taken.has(idx) && (h === key || h.startsWith(`${key} `)));
    if (i >= 0) return i;
  }
  return -1;
}

/** First row (within the first 30) that looks like a header: a date column and an amount source. */
export function findHeaderRow(grid: Grid): number {
  for (let r = 0; r < Math.min(grid.length, 30); r++) {
    if (guessFromHeaders(grid[r])) return r;
  }
  return -1;
}

function guessFromHeaders(row: Cell[]): Omit<ColumnMapping, "headerRow"> | null {
  const headers = row.map((c) => norm(cellText(c)));
  const taken = new Set<number>();
  const pick = (field: Field) => {
    const i = findColumn(headers, field, taken);
    if (i >= 0) taken.add(i);
    return i;
  };
  const date = pick("date");
  if (date < 0) return null;
  const amount = pick("amount");
  const inflow = amount < 0 ? pick("inflow") : -1;
  const outflow = amount < 0 ? pick("outflow") : -1;
  if (amount < 0 && (inflow < 0 || outflow < 0)) return null;
  const description = pick("description");
  if (description < 0) return null;
  const category = pick("category");
  return {
    date,
    description,
    amount: amount >= 0 ? { mode: "signed", column: amount } : { mode: "split", inflow, outflow },
    ...(category >= 0 ? { category } : {}),
  };
}

/** Best-effort mapping from the header row; null when the user has to map columns by hand. */
export function guessMapping(grid: Grid): ColumnMapping | null {
  const headerRow = findHeaderRow(grid);
  if (headerRow < 0) return null;
  const guess = guessFromHeaders(grid[headerRow])!;
  return { headerRow, ...guess };
}

function rowAmount(row: Cell[], amount: ColumnMapping["amount"]): number | null {
  if (amount.mode === "signed") {
    const v = parseAmount(row[amount.column] ?? null);
    return v == null ? null : amount.invert ? -v : v;
  }
  // Split columns: banks write both as positive numbers, some put a minus on the outflow.
  const inflow = parseAmount(row[amount.inflow] ?? null);
  const outflow = parseAmount(row[amount.outflow] ?? null);
  if (inflow == null && outflow == null) return null;
  return Math.abs(inflow ?? 0) - Math.abs(outflow ?? 0);
}

/** Maps data rows to drafts; blank rows are ignored, invalid ones are reported with a reason. */
export function mapRows(grid: Grid, mapping: ColumnMapping): MappedRows {
  const drafts: ImportDraft[] = [];
  const skipped: SkippedRow[] = [];
  for (let r = mapping.headerRow + 1; r < grid.length; r++) {
    const row = grid[r];
    const line = r + 1;
    if (row.every((c) => cellText(c) === "")) continue;

    const failed = mapping.filters?.find((f) => !f.values.map(norm).includes(norm(cellText(row[f.column] ?? null))));
    if (failed) {
      skipped.push({ line, reason: failed.reason });
      continue;
    }

    const bookedOn = parseDate(row[mapping.date] ?? null, mapping.dateOrder);
    if (!bookedOn) {
      skipped.push({ line, reason: "Data non valida" });
      continue;
    }
    const amount = rowAmount(row, mapping.amount);
    // Fees reduce the balance whatever sign the export uses for them.
    const amountCents = amount == null || mapping.fee == null ? amount : amount - Math.abs(parseAmount(row[mapping.fee] ?? null) ?? 0);
    if (amountCents == null) {
      skipped.push({ line, reason: "Importo non valido" });
      continue;
    }
    if (amountCents === 0) {
      skipped.push({ line, reason: "Importo pari a zero" });
      continue;
    }
    const description = [mapping.description, ...(mapping.extraDescription ?? [])]
      .map((i) => cellText(row[i] ?? null))
      .filter(Boolean)
      .join(" - ");
    const category = mapping.category != null ? cellText(row[mapping.category] ?? null) || null : null;
    drafts.push({ line, bookedOn, amountCents, description: description || "Movimento importato", category });
  }
  return { drafts, skipped };
}
