// Money and date formatting shared by every component.
import { messages } from "../i18n";
export interface MoneyFormatOptions {
  currency?: string;
  locale?: string;
  /** Always show + for positive values. */
  signDisplay?: "auto" | "always" | "never";
  compact?: boolean;
  /** Hide fraction digits (e.g. axis ticks). */
  whole?: boolean;
}

export const DEFAULT_LOCALE = messages.locale;
export const DEFAULT_CURRENCY = "EUR";

/** Converts integer cents to a localized currency string. */
export function formatMoney(cents: number, opts: MoneyFormatOptions = {}): string {
  const { currency = DEFAULT_CURRENCY, locale = DEFAULT_LOCALE, signDisplay = "auto", compact, whole } = opts;
  const fmt = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    signDisplay: signDisplay === "always" ? "exceptZero" : signDisplay,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : whole ? 0 : 2,
    minimumFractionDigits: compact || whole ? 0 : 2,
  });
  // Use a true minus sign for typographic alignment.
  return fmt.format(cents / 100).replace("-", "−");
}

/** Splits a formatted amount into whole and fraction parts for ledger-style rendering. */
export function splitMoney(cents: number, opts: MoneyFormatOptions = {}): { whole: string; fraction: string } {
  const text = formatMoney(cents, opts);
  const parts = new Intl.NumberFormat(opts.locale ?? DEFAULT_LOCALE, { style: "currency", currency: opts.currency ?? DEFAULT_CURRENCY }).formatToParts(1.1);
  const decimal = parts.find((p) => p.type === "decimal")?.value ?? ".";
  const idx = text.lastIndexOf(decimal);
  if (idx === -1 || opts.compact || opts.whole) return { whole: text, fraction: "" };
  return { whole: text.slice(0, idx), fraction: text.slice(idx) };
}

/** Parses user input like "1,234.50" or "12,5" into integer cents. Returns null when invalid. */
export function parseMoneyInput(input: string): number | null {
  const cleaned = input.replace(/[^\d.,-]/g, "");
  if (!cleaned || !/\d/.test(cleaned)) return null;
  const lastSep = Math.max(cleaned.lastIndexOf("."), cleaned.lastIndexOf(","));
  let normalized: string;
  if (lastSep === -1) {
    normalized = cleaned;
  } else {
    const decimals = cleaned.slice(lastSep + 1);
    const intPart = cleaned.slice(0, lastSep).replace(/[.,]/g, "");
    // A separator followed by exactly 3 digits and no other separator is a thousands separator.
    normalized = decimals.length === 3 && !/[.,]/.test(cleaned.slice(0, lastSep)) ? intPart + decimals : `${intPart}.${decimals}`;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}

/** Whole days from `from` to `date` (negative when past). */
export function daysUntil(date: Date | string, from: Date = new Date()): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const b = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((a - b) / 86_400_000);
}

/** Human label for a due date: "Today", "Tomorrow", "In 5 days", "3 days overdue". */
export function relativeDueLabel(days: number): string {
  if (days === 0) return messages.today;
  if (days === 1) return messages.tomorrow;
  if (days < 0) return messages.daysOverdue(Math.abs(days));
  return messages.inDays(days);
}

/** Short date like "5 Nov" or "5 Nov 2025" when the year differs. */
export function formatShortDate(date: Date | string, locale = DEFAULT_LOCALE, now: Date = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  }).format(d);
}

/** Percentage with sign, e.g. "+4.2%". */
export function formatPercent(value: number, digits = 1): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
}

/** Initials from a display name, max two letters. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
