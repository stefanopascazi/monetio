// Parsing of amounts and dates as they appear in Italian bank exports and spreadsheets.
import { daysInMonth, toISODate } from "../domain/dates";
import type { ISODate } from "../domain/types";
import type { Cell } from "./types";

/**
 * Signed cents from "1.234,56", "-12,30", "12,30-", "(12,30)", "€ 5", "-12.50" or a number.
 * With both separators the last one is decimal; a lone "." followed by exactly 3 digits
 * is read as thousands (Italian "1.234").
 */
export function parseAmount(cell: Cell): number | null {
  if (typeof cell === "number") return Number.isFinite(cell) ? Math.round(cell * 100) : null;
  if (typeof cell !== "string") return null;
  let s = cell.replace(/[\s ]|€|eur/gi, "");
  if (!s) return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (/^[+-]/.test(s)) {
    negative = negative !== (s[0] === "-");
    s = s.slice(1);
  } else if (/-$/.test(s)) {
    negative = !negative;
    s = s.slice(0, -1);
  }

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    s = s.split(thousands).join("").replace(decimal, ".");
  } else if (lastComma >= 0) {
    // Several commas are thousands separators; a single one is the Italian decimal comma.
    s = s.split(",").length > 2 ? s.split(",").join("") : s.replace(",", ".");
  } else if (lastDot >= 0) {
    const parts = s.split(".");
    if (parts.length > 2 || parts[1].length === 3) s = parts.join("");
  }

  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const cents = Math.round(Number(s) * 100);
  return negative ? -cents : cents;
}

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const pad = (n: number) => String(n).padStart(2, "0");

function validDate(y: number, m: number, d: number): ISODate | null {
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** ISO date from "31/12/2025", "31-12-25", "31.12.2025 10:22", "2025-12-31", an Excel serial or a Date. */
export function parseDate(cell: Cell, order: "dmy" | "mdy" = "dmy"): ISODate | null {
  if (cell instanceof Date) return Number.isNaN(cell.getTime()) ? null : toISODate(cell);
  // Excel stores dates as days since 1899-12-30; the range keeps out plain amounts.
  if (typeof cell === "number") {
    if (cell < 20000 || cell > 80000) return null;
    return toISODate(new Date(EXCEL_EPOCH + Math.floor(cell) * 86_400_000));
  }
  if (typeof cell !== "string") return null;
  const s = cell.trim();

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/.exec(s);
  if (iso) return validDate(+iso[1], +iso[2], +iso[3]);

  const local = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})(?:\s.*)?$/.exec(s);
  if (!local) return null;
  const [a, b] = [+local[1], +local[2]];
  const y = local[3].length === 2 ? 2000 + +local[3] : +local[3];
  return order === "dmy" ? validDate(y, b, a) : validDate(y, a, b);
}
