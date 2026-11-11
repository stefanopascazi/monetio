// Reads the first non-empty worksheet of an XLSX file into a plain grid (server side).
import ExcelJS from "exceljs";
import type { Cell, Grid } from "./types";

/** Plain value of an ExcelJS cell: formulas give their cached result, rich text its text. */
export function plainValue(v: ExcelJS.CellValue): Cell {
  if (v == null) return null;
  if (typeof v === "number" || typeof v === "string" || v instanceof Date) return v;
  if (typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    if ("result" in v) return plainValue((v.result ?? null) as ExcelJS.CellValue);
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return String(v.text);
  }
  return null;
}

export async function readXlsxGrid(data: ArrayBuffer): Promise<Grid> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data);
  const ws = wb.worksheets.find((s) => s.actualRowCount > 0);
  if (!ws) return [];
  const grid: Grid = [];
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const cells: Cell[] = [];
    for (let c = 1; c <= ws.columnCount; c++) cells.push(plainValue(row.getCell(c).value));
    grid.push(cells);
  }
  return grid;
}
