import { monthKey, monthLabel } from "../domain/dates";

export interface DueGroup<T> {
  month: string;
  label: string;
  /** "past" for overdue months, "current" for this month, "next" for later ones. */
  tone: "past" | "current" | "next";
  items: T[];
}

/** Splits deadlines by month of their (effective) date, oldest first, with readable headers. */
export function groupDueByMonth<T extends { date: string }>(items: T[], today: string): DueGroup<T>[] {
  const current = monthKey(today);
  const groups = new Map<string, T[]>();
  for (const item of [...items].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = monthKey(item.date);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()].map(([month, list]) => {
    const tone = month < current ? "past" : month === current ? "current" : "next";
    const suffix = tone === "past" ? " · arretrate" : tone === "current" ? " · questo mese" : "";
    return { month, label: `${monthLabel(month, true)}${suffix}`, tone, items: list };
  });
}
