// Italian, human-readable summary of when a recurring rule fires.
import { parseISO } from "@/lib/domain/dates";
import { FREQUENCY_MONTHS } from "@/lib/domain/recurrence";
import type { ISODate, RuleFrequency } from "@/lib/domain/types";

const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const WEEKDAYS = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];

const EVERY: Record<Exclude<RuleFrequency, "weekly" | "monthly" | "yearly">, string> = {
  bimonthly: "Ogni 2 mesi",
  quarterly: "Ogni 3 mesi",
  semiannual: "Ogni 6 mesi",
};

/** E.g. "Ogni anno il 15 marzo", "Ogni 3 mesi il giorno 10 (gennaio, aprile, luglio, ottobre)". */
export function recurrenceSummary(frequency: RuleFrequency, firstDate: ISODate, dayOfMonth?: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(firstDate)) return "";
  const { y, m, d } = parseISO(firstDate);
  const day = dayOfMonth ?? d;
  if (frequency === "weekly") return `Ogni settimana di ${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}`;
  if (frequency === "monthly") return `Ogni mese il giorno ${day}`;
  if (frequency === "yearly") return `Ogni anno il ${day} ${MONTHS[m - 1]}`;
  const step = FREQUENCY_MONTHS[frequency];
  const months = Array.from({ length: 12 / step }, (_, i) => (m - 1 + i * step) % 12)
    .sort((a, b) => a - b)
    .map((i) => MONTHS[i]);
  return `${EVERY[frequency]} il giorno ${day} (${months.join(", ")})`;
}
