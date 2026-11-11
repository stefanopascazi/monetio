// Known bank export layouts, recognised by their header row. Falls back to generic guessing.
import { normalizeDescription as norm } from "./dedup";
import { cellText, guessMapping } from "./mapping";
import type { Cell, ColumnMapping, Grid } from "./types";

type Columns = (name: string) => number;

export interface BankPreset {
  id: string;
  name: string;
  /** Alternative header sets (e.g. app language); all names of one set must be present. */
  headers: string[][];
  mapping: (col: Columns) => Omit<ColumnMapping, "headerRow">;
}

export const PRESETS: BankPreset[] = [
  {
    id: "revolut",
    name: "Revolut",
    headers: [
      ["tipo", "prodotto", "data di inizio", "descrizione", "importo", "costo", "state"],
      ["type", "product", "started date", "description", "amount", "fee", "state"],
    ],
    mapping: (col) => ({
      // Start date is always filled (completion is empty for pending/cancelled operations).
      date: col("data di inizio") >= 0 ? col("data di inizio") : col("started date"),
      description: col("descrizione") >= 0 ? col("descrizione") : col("description"),
      amount: { mode: "signed", column: col("importo") >= 0 ? col("importo") : col("amount") },
      fee: col("costo") >= 0 ? col("costo") : col("fee"),
      filters: [
        { column: col("state"), values: ["completato", "completed"], reason: "Operazione non completata" },
        // Savings pockets are separate balances: import them into their own account.
        { column: col("prodotto") >= 0 ? col("prodotto") : col("product"), values: ["attuale", "current"], reason: "Movimento di un salvadanaio Revolut" },
      ],
    }),
  },
  {
    id: "cherry",
    name: "Cherry Bank",
    headers: [["data contabile", "valuta", "dare", "avere", "divisa", "causale", "descrizione"]],
    mapping: (col) => ({
      date: col("data contabile"),
      description: col("descrizione"),
      amount: { mode: "split", inflow: col("avere"), outflow: col("dare") },
    }),
  },
];

function matchPreset(row: Cell[]): { preset: BankPreset; col: Columns } | null {
  const headers = row.map((c) => norm(cellText(c)));
  const col: Columns = (name) => headers.indexOf(name);
  const preset = PRESETS.find((p) => p.headers.some((set) => set.every((h) => headers.includes(h))));
  return preset ? { preset, col } : null;
}

export interface DetectedMapping {
  mapping: ColumnMapping;
  /** Bank name when a preset matched; null for a generic guess. */
  bank: string | null;
}

/** Preset first (within the first 30 rows), then generic header guessing. */
export function detectMapping(grid: Grid): DetectedMapping | null {
  for (let r = 0; r < Math.min(grid.length, 30); r++) {
    const hit = matchPreset(grid[r]);
    if (hit) return { mapping: { headerRow: r, ...hit.preset.mapping(hit.col) }, bank: hit.preset.name };
  }
  const guess = guessMapping(grid);
  return guess ? { mapping: guess, bank: null } : null;
}
