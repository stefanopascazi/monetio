import type { ISODate } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(d: Date): ISODate {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Today in the given time zone (defaults to Europe/Rome). */
export function todayISO(now: Date = new Date(), timeZone = "Europe/Rome"): ISODate {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function parseISO(date: ISODate): { y: number; m: number; d: number } {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d };
}

/** Local Date at midnight for UI components that take a Date. */
export function isoToDate(date: ISODate): Date {
  const { y, m, d } = parseISO(date);
  return new Date(y, m - 1, d);
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Builds a date clamping the day to the month length (31 Feb -> 28/29 Feb). */
export function makeDate(y: number, m: number, d: number): ISODate {
  const yy = y + Math.floor((m - 1) / 12);
  const mm = ((((m - 1) % 12) + 12) % 12) + 1;
  return `${yy}-${pad(mm)}-${pad(Math.min(d, daysInMonth(yy, mm)))}`;
}

export function addDays(date: ISODate, n: number): ISODate {
  const { y, m, d } = parseISO(date);
  return toISODate(new Date(Date.UTC(y, m - 1, d + n)));
}

/** `YYYY-MM` key of a date. */
export function monthKey(date: ISODate): string {
  return date.slice(0, 7);
}

export function addMonthsToKey(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  return makeDate(y, m + n, 1).slice(0, 7);
}

export function startOfMonth(key: string): ISODate {
  return `${key}-01`;
}

export function endOfMonth(key: string): ISODate {
  const [y, m] = key.split("-").map(Number);
  return makeDate(y, m, 31);
}

/** Whole months between two month keys (b - a). */
export function monthsBetween(a: string, b: string): number {
  const [ya, ma] = a.split("-").map(Number);
  const [yb, mb] = b.split("-").map(Number);
  return (yb - ya) * 12 + (mb - ma);
}

export function daysBetween(a: ISODate, b: ISODate): number {
  const pa = parseISO(a);
  const pb = parseISO(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86_400_000);
}

const MONTHS_IT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const MONTHS_IT_LONG = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

/** "nov 2026" style label for a month key. */
export function monthLabel(key: string, long = false): string {
  const [y, m] = key.split("-").map(Number);
  return `${(long ? MONTHS_IT_LONG : MONTHS_IT)[m - 1]} ${y}`;
}

/** "5 nov 2026" style label for a date. */
export function dateLabel(date: ISODate): string {
  const { y, m, d } = parseISO(date);
  return `${d} ${MONTHS_IT[m - 1]} ${y}`;
}

/** Italian month name (any case) to its number, or null. */
export function italianMonthNumber(name: string): number | null {
  const i = MONTHS_IT_LONG.indexOf(name.trim().toLowerCase());
  return i === -1 ? null : i + 1;
}
