// Validation of drafts sent by the browser to the import Server Actions.
import { isISODate } from "../forms/parse";
import type { ImportDraft } from "./types";

export const MAX_IMPORT_ROWS = 5000;
const MAX_TEXT = 500;

function draft(v: unknown): ImportDraft | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  const { line, bookedOn, amountCents, description, category } = r;
  if (!Number.isInteger(line) || (line as number) < 1) return null;
  if (typeof bookedOn !== "string" || !isISODate(bookedOn)) return null;
  if (!Number.isSafeInteger(amountCents) || amountCents === 0) return null;
  if (typeof description !== "string" || !description.trim()) return null;
  if (category != null && typeof category !== "string") return null;
  return {
    line: line as number,
    bookedOn,
    amountCents: amountCents as number,
    description: description.trim().slice(0, MAX_TEXT),
    category: category ? category.trim().slice(0, MAX_TEXT) || null : null,
  };
}

/** Parsed drafts, or null when the payload is not a valid list (any bad row rejects it). */
export function parseDrafts(input: unknown): ImportDraft[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_IMPORT_ROWS) return null;
  const out: ImportDraft[] = [];
  for (const v of input) {
    const d = draft(v);
    if (!d) return null;
    out.push(d);
  }
  return out;
}
