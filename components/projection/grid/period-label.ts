import type { GridColumn } from "@/lib/data/projection-grid";
import { monthLabel } from "@/lib/domain/dates";

/** Column heading: "Nov 2026" for months, "2027" for years ("2026 · 2 mesi" when partial). */
export function periodLabel(c: GridColumn): string {
  if (c.key.length > 4) return monthLabel(c.key);
  return c.months && c.months < 12 ? `${c.key} · ${c.months} ${c.months === 1 ? "mese" : "mesi"}` : c.key;
}
