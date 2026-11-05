// Reads the history rows of "Piano Risparmi" from the xlsx export (formulas, cached values, comments).
import ExcelJS from "exceljs";
import { italianMonthNumber } from "../../lib/domain/dates.ts";
import type { SheetCell, SheetRow } from "./build.ts";
import { ACCOUNTS, COLUMNS, FIRST_ROW, HISTORY_FILL, MONTH_COL, SHEET_NAME, YEAR_COL } from "./mapping.ts";

type Note = string | { texts?: { text: string }[] } | undefined;

function noteText(note: Note): string | undefined {
  if (!note) return undefined;
  if (typeof note === "string") return note;
  return note.texts?.map((t) => t.text).join("") || undefined;
}

function readCell(cell: ExcelJS.Cell): SheetCell {
  const v = cell.value as unknown;
  let value: number | null = null;
  let formula: string | undefined;
  if (typeof v === "number") value = v;
  else if (v && typeof v === "object" && "formula" in v) {
    const f = v as { formula: string; result?: unknown };
    formula = `=${f.formula}`;
    value = typeof f.result === "number" ? f.result : null;
  } else if (v && typeof v === "object" && "sharedFormula" in v) {
    const f = v as { result?: unknown };
    formula = `=${cell.formula}`;
    value = typeof f.result === "number" ? f.result : null;
  }
  return { value, formula, comment: noteText(cell.note as Note) };
}

export async function readHistoryRows(path: string): Promise<SheetRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const ws = wb.getWorksheet(SHEET_NAME);
  if (!ws) throw new Error(`Foglio "${SHEET_NAME}" non trovato`);

  const cols = [...new Set([...COLUMNS.map((c) => c.col), ...ACCOUNTS.map((a) => a.balanceCol)])];
  const rows: SheetRow[] = [];
  let year: number | null = null;
  for (let r = FIRST_ROW; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const monthCell = row.getCell(MONTH_COL);
    const fill = (monthCell.fill as { fgColor?: { argb?: string } } | undefined)?.fgColor?.argb;
    if (fill !== HISTORY_FILL) break;
    const month = italianMonthNumber(String(monthCell.value ?? ""));
    if (!month) continue;
    const y = readCell(row.getCell(YEAR_COL)).value;
    year = y ?? (year !== null ? (month === 1 ? year + 1 : year) : null);
    if (year === null) throw new Error(`Anno mancante alla riga ${r}`);
    const cells: Record<string, SheetCell> = {};
    for (const col of cols) {
      const cell = readCell(row.getCell(col));
      if (cell.value !== null || cell.comment) cells[col] = cell;
    }
    rows.push({ row: r, year, month, cells });
  }
  return rows;
}
