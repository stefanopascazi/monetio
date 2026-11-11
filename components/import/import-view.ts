// Pure helpers behind the import screen: select options, defaults and the selection summary.
import type { SelectOption } from "@monetio/ui";
import type { DraftStatus } from "@/lib/import/classify";
import { cellText } from "@/lib/import/mapping";
import type { ColumnMapping, Grid, ImportDraft } from "@/lib/import/types";

/** Spreadsheet-style column name: 0 -> A, 26 -> AA. */
export function columnLetter(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

const width = (grid: Grid) => Math.max(0, ...grid.map((r) => r.length));

export function columnOptions(grid: Grid, headerRow: number): SelectOption[] {
  const header = grid[headerRow] ?? [];
  return Array.from({ length: width(grid) }, (_, i) => ({ value: String(i), label: `${columnLetter(i)} · ${cellText(header[i] ?? null) || "(senza titolo)"}` }));
}

/** The first rows as candidates for the header, previewed by their first non-empty cells. */
export function headerRowOptions(grid: Grid, max = 30): SelectOption[] {
  return grid.slice(0, max).map((row, r) => {
    const text = row.map((c) => cellText(c)).filter(Boolean).slice(0, 3).join(", ");
    return { value: String(r), label: `Riga ${r + 1}: ${text.length > 50 ? `${text.slice(0, 50)}…` : text || "(vuota)"}` };
  });
}

/** Starting point when no preset or header matched: the user adjusts it by hand. */
export function fallbackMapping(grid: Grid): ColumnMapping {
  const last = Math.max(0, width(grid) - 1);
  return { headerRow: 0, date: 0, description: Math.min(1, last), amount: { mode: "signed", column: Math.min(2, last) } };
}

export const isSelectable = (s: DraftStatus | undefined) => s?.kind === "new" || s?.kind === "possible";

/** New rows start selected; possible duplicates wait for the user's choice. */
export function isSelected(line: number, status: DraftStatus | undefined, choices: ReadonlyMap<number, boolean>): boolean {
  if (!isSelectable(status)) return false;
  return choices.get(line) ?? status?.kind === "new";
}

export interface SelectionSummary {
  count: number;
  totalCents: number;
  from: string | null;
  to: string | null;
  duplicates: number;
  possible: number;
  beforeOpening: number;
}

export function summarize(drafts: ImportDraft[], statuses: DraftStatus[], choices: ReadonlyMap<number, boolean>): SelectionSummary {
  const s: SelectionSummary = { count: 0, totalCents: 0, from: null, to: null, duplicates: 0, possible: 0, beforeOpening: 0 };
  drafts.forEach((d, i) => {
    const status = statuses[i];
    if (status?.kind === "duplicate") s.duplicates++;
    if (status?.kind === "possible") s.possible++;
    if (status?.kind === "beforeOpening") s.beforeOpening++;
    if (!isSelected(d.line, status, choices)) return;
    s.count++;
    s.totalCents += d.amountCents;
    if (!s.from || d.bookedOn < s.from) s.from = d.bookedOn;
    if (!s.to || d.bookedOn > s.to) s.to = d.bookedOn;
  });
  return s;
}
