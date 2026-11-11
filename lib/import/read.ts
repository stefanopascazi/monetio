// Turns an uploaded statement (CSV or XLSX) into a grid the browser can map.
import { parseCsv } from "./csv";
import type { Grid } from "./types";
import { readXlsxGrid } from "./xlsx";

export const MAX_FILE_BYTES = 3 * 1024 * 1024;
export const MAX_GRID_ROWS = 6000;

/** Grid cells safe to send to the client: Excel dates become ISO dates. */
export type PlainCell = string | number | null;

/** UTF-8 when valid, otherwise Windows-1252 (older Italian bank exports). */
export function decodeText(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export function plainGrid(grid: Grid): PlainCell[][] {
  return grid.map((row) => row.map((c) => (c instanceof Date ? c.toISOString().slice(0, 10) : c)));
}

/** Drops trailing empty rows and columns (XLSX sheets often report a larger used range). */
export function trimGrid(grid: PlainCell[][]): PlainCell[][] {
  const empty = (c: PlainCell) => c == null || (typeof c === "string" && c.trim() === "");
  const rows = [...grid];
  while (rows.length && rows[rows.length - 1].every(empty)) rows.pop();
  const width = Math.max(0, ...rows.map((r) => r.findLastIndex((c) => !empty(c)) + 1));
  return rows.map((r) => Array.from({ length: width }, (_, i) => r[i] ?? null));
}

export type ReadResult = { ok: true; grid: PlainCell[][] } | { ok: false; message: string };

export async function readStatement(name: string, data: ArrayBuffer): Promise<ReadResult> {
  if (data.byteLength === 0) return { ok: false, message: "Il file è vuoto." };
  if (data.byteLength > MAX_FILE_BYTES) return { ok: false, message: "Il file supera i 3 MB." };
  const ext = name.toLowerCase().split(".").pop();
  let grid: Grid;
  try {
    if (ext === "csv" || ext === "txt") grid = parseCsv(decodeText(new Uint8Array(data)));
    else if (ext === "xlsx") grid = await readXlsxGrid(data);
    else return { ok: false, message: "Formato non supportato: carica un file CSV o XLSX." };
  } catch {
    return { ok: false, message: "Non riesco a leggere il file. È un CSV o XLSX valido?" };
  }
  const plain = trimGrid(plainGrid(grid));
  if (!plain.length) return { ok: false, message: "Il file non contiene righe." };
  if (plain.length > MAX_GRID_ROWS) return { ok: false, message: `Il file ha più di ${MAX_GRID_ROWS} righe: dividilo in più parti.` };
  return { ok: true, grid: plain };
}
