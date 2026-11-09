// Spreadsheet view of the projection detail: rows by group, category and line, one column per period.
import { TRANSFERS_LABEL, UNCATEGORIZED_LABEL } from "../domain/booked-month";
import type { DetailItem, ProjectionDetailMonth } from "../domain/projection-details";

export const TRANSFERS_CATEGORY = "Giroconti e quote";
export const BOOKED_LINE = "Movimenti registrati";

export interface GridCell {
  /** Already booked (current period only). */
  bookedCents: number;
  expectedCents: number;
  totalCents: number;
}

export interface GridColumn {
  /** `YYYY-MM`, or `YYYY` for yearly columns. */
  key: string;
  /** Holds the current month. */
  current: boolean;
  /** Yearly columns: months covered (a partial first/last year has fewer than 12). */
  months?: number;
}

export interface GridRow {
  id: string;
  label: string;
  cells: GridCell[];
}

export interface GridCategory extends GridRow {
  lines: GridRow[];
}

export interface GridGroup extends GridRow {
  id: "income" | "expense";
  categories: GridCategory[];
}

export interface ProjectionGrid {
  columns: GridColumn[];
  openingCents: number[];
  groups: GridGroup[];
  netCents: number[];
  closingCents: number[];
}

type Period = ProjectionDetailMonth & { months?: number };

const zero = (): GridCell => ({ bookedCents: 0, expectedCents: 0, totalCents: 0 });

function addTo(cell: GridCell, it: DetailItem) {
  if (it.source === "booked") cell.bookedCents += it.amountCents;
  else cell.expectedCents += it.amountCents;
  cell.totalCents += it.amountCents;
}

const sumCells = (rows: GridRow[], width: number): GridCell[] =>
  Array.from({ length: width }, (_, i) =>
    rows.reduce((s, r) => ({ bookedCents: s.bookedCents + r.cells[i].bookedCents, expectedCents: s.expectedCents + r.cells[i].expectedCents, totalCents: s.totalCents + r.cells[i].totalCents }), zero()),
  );

const weight = (r: GridRow) => r.cells.reduce((s, c) => s + Math.abs(c.totalCents), 0);

function categoryOf(it: DetailItem, names: Record<string, string>): string {
  if (it.transfer) return TRANSFERS_CATEGORY;
  return (it.categoryId && names[it.categoryId]) || UNCATEGORIZED_LABEL;
}

// Booked non-transfer lines are already grouped by category: inside it they read as "booked".
const lineLabel = (it: DetailItem) => (it.source === "booked" && !it.transfer ? BOOKED_LINE : it.label === TRANSFERS_LABEL ? "Altri giroconti" : it.label);

/**
 * Grid of the merged `accountIds`. Transfers whose both sides are merged are dropped,
 * income and expense lines never net out, largest categories and lines come first.
 */
export function projectionGrid(periods: Period[], accountIds: string[], categoryNames: Record<string, string>, currentMonth: string): ProjectionGrid {
  const merged = new Set(accountIds);
  const columns: GridColumn[] = periods.map((p) => ({
    key: p.month,
    current: p.month === currentMonth || (p.month.length === 4 && currentMonth.startsWith(p.month)),
    ...(p.months ? { months: p.months } : {}),
  }));
  const width = periods.length;
  const tree = new Map<string, Map<string, Map<string, GridRow>>>();

  periods.forEach((p, i) => {
    for (const id of accountIds) {
      for (const it of p.byAccount[id]?.items ?? []) {
        if (!it.amountCents || (it.counterpartId && merged.has(it.counterpartId))) continue;
        const group = it.amountCents > 0 ? "income" : "expense";
        const category = categoryOf(it, categoryNames);
        const label = lineLabel(it);
        const cats = tree.get(group) ?? new Map();
        tree.set(group, cats);
        const lines = cats.get(category) ?? new Map();
        cats.set(category, lines);
        const row = lines.get(label) ?? { id: `${group}|${category}|${label}`, label, cells: Array.from({ length: width }, zero) };
        lines.set(label, row);
        addTo(row.cells[i], it);
      }
    }
  });

  const groups: GridGroup[] = (["income", "expense"] as const).map((g) => {
    const categories = [...(tree.get(g) ?? new Map<string, Map<string, GridRow>>())].map(([name, lines]) => {
      const rows = [...lines.values()].sort((a, b) => weight(b) - weight(a));
      return { id: `${g}|${name}`, label: name, lines: rows, cells: sumCells(rows, width) };
    });
    categories.sort((a, b) => weight(b) - weight(a));
    return { id: g, label: g === "income" ? "Entrate" : "Uscite", categories, cells: sumCells(categories, width) };
  });

  const total = (p: Period, k: "openingCents" | "closingCents") => accountIds.reduce((s, id) => s + (p.byAccount[id]?.[k] ?? 0), 0);
  const openingCents = periods.map((p) => total(p, "openingCents"));
  const closingCents = periods.map((p) => total(p, "closingCents"));
  return { columns, openingCents, groups, netCents: closingCents.map((c, i) => c - openingCents[i]), closingCents };
}
