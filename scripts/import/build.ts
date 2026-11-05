// Pure transformation from parsed sheet rows to import records.
import { addDays, endOfMonth, makeDate } from "../../lib/domain/dates.ts";
import { addendsNote, isConstantFormula } from "./formula.ts";
import { ACCOUNTS, type AccountKey, COLUMNS } from "./mapping.ts";

export interface SheetCell {
  value: number | null;
  formula?: string;
  comment?: string;
}

export interface SheetRow {
  row: number;
  year: number;
  month: number;
  cells: Record<string, SheetCell>;
}

export interface ImportTransaction {
  ref: string;
  account: AccountKey;
  counterpart: AccountKey | null;
  date: string;
  amountCents: number;
  kind: "income" | "expense" | "transfer" | "adjustment";
  category: string;
  description: string;
  notes: string | null;
}

export interface ImportAccount {
  key: AccountKey;
  openingCents: number;
  openingDate: string;
  finalCents: number;
}

export interface ImportResult {
  accounts: ImportAccount[];
  transactions: ImportTransaction[];
  warnings: string[];
}

const cents = (v: number) => Math.round(v * 100);
const firstDay = (r: SheetRow) => makeDate(r.year, r.month, 1);
const lastDay = (r: SheetRow) => endOfMonth(firstDay(r).slice(0, 7));

/** Comment text cleaned for a description (first line, trimmed). */
function commentText(comment: string | undefined): string | null {
  const line = comment?.split(/\r?\n|\s\/\s/).map((s) => s.trim()).find(Boolean);
  return line ? line.charAt(0).toUpperCase() + line.slice(1) : null;
}

/**
 * One transaction per non-empty cell, plus an adjustment per month when the sheet's running
 * balance does not equal previous balance + cells (hard-coded fixes or excluded columns),
 * so imported balances match the sheet exactly.
 */
export function buildImport(rows: SheetRow[]): ImportResult {
  const transactions: ImportTransaction[] = [];
  const accounts: ImportAccount[] = [];
  const warnings: string[] = [];

  for (const acc of ACCOUNTS) {
    const cols = COLUMNS.filter((c) => c.account === acc.key);
    const first = rows.find((r) => r.cells[acc.balanceCol]?.value != null);
    if (!first) {
      warnings.push(`${acc.name}: nessun saldo trovato`);
      continue;
    }
    const startCell = first.cells[acc.balanceCol];
    // A constant balance in the first row is the opening balance; a formula means we start from zero.
    const openingFromCell = isConstantFormula(startCell.formula);
    const openingCents = openingFromCell ? cents(startCell.value!) : 0;
    let prev = openingCents;

    for (const r of rows.filter((x) => x.row >= first.row)) {
      const isOpeningRow = r === first && openingFromCell;
      let monthSum = 0;
      for (const spec of cols) {
        const cell = r.cells[spec.col];
        if (!cell || cell.value == null || cents(cell.value) === 0) continue;
        if (isOpeningRow) {
          warnings.push(`${acc.name}: ${spec.col}${r.row} ignorata (riga del saldo iniziale)`);
          continue;
        }
        const amount = cents(cell.value);
        monthSum += amount;
        const comment = commentText(cell.comment);
        transactions.push({
          ref: `xlsx:${spec.col}${r.row}`,
          account: acc.key,
          counterpart: spec.counterpart ?? null,
          date: firstDay(r),
          amountCents: amount,
          kind: spec.counterpart ? "transfer" : amount >= 0 ? "income" : "expense",
          category: spec.category,
          description: comment ?? spec.label,
          notes: [comment ? spec.label : null, cell.comment && cell.comment.trim().toLowerCase() !== comment?.toLowerCase() ? cell.comment.trim() : null, addendsNote(cell.formula)]
            .filter(Boolean)
            .join("\n") || null,
        });
      }
      if (isOpeningRow) continue;
      const bal = r.cells[acc.balanceCol]?.value;
      if (bal == null) {
        prev += monthSum;
        continue;
      }
      const diff = cents(bal) - prev - monthSum;
      if (diff !== 0) {
        transactions.push({
          ref: `xlsx:adj:${acc.balanceCol}${r.row}`,
          account: acc.key,
          counterpart: null,
          date: lastDay(r),
          amountCents: diff,
          kind: "adjustment",
          category: "Rettifiche",
          description: "Rettifica saldo da foglio",
          notes: `Allinea il saldo alla cella ${acc.balanceCol}${r.row} del foglio`,
        });
      }
      prev = cents(bal);
    }

    // Opening balance is dated the day before the first imported month.
    const openingDate = openingFromCell ? lastDay(first) : addDays(firstDay(first), -1);
    accounts.push({ key: acc.key, openingCents, openingDate, finalCents: prev });
  }

  return { accounts, transactions, warnings };
}
