// When the worker syncs bank accounts: shared by the worker schedule and the page that shows the next run.

/**
 * Four runs a day: PSD2 allows four unattended reads per account per day.
 * Spread over waking hours only, Rome wall-clock time (DST-aware).
 */
export const BANK_SYNC_HOURS = [8, 12, 18, 23];
export const BANK_SYNC_TIME_ZONE = "Europe/Rome";

/** Next sync slot after `now`, as the Rome hour and whether it falls tomorrow. */
export function nextSyncSlot(now: Date, hours: number[] = BANK_SYNC_HOURS, timeZone = BANK_SYNC_TIME_ZONE): { hour: number; tomorrow: boolean } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", hour: "numeric" }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const sorted = [...hours].sort((a, b) => a - b);
  // A slot counts as past once its hour starts (the run may be in progress): show the following one.
  const next = sorted.find((h) => h > hour);
  return next === undefined ? { hour: sorted[0], tomorrow: true } : { hour: next, tomorrow: false };
}

/** "oggi alle 12:00" / "domani alle 8:00". */
export function nextSyncLabel(now: Date, hours: number[] = BANK_SYNC_HOURS): string {
  const { hour, tomorrow } = nextSyncSlot(now, hours);
  return `${tomorrow ? "domani" : "oggi"} alle ${hour}:00`;
}

/** Rome hour of the latest slot started at `now` (yesterday's last one before the first of the day). */
export function currentSyncSlot(now: Date, hours: number[] = BANK_SYNC_HOURS, timeZone = BANK_SYNC_TIME_ZONE): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", hour: "numeric" }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const sorted = [...hours].sort((a, b) => a - b);
  return sorted.filter((h) => h <= hour).at(-1) ?? sorted.at(-1)!;
}

/**
 * Slots an account may use when its bank allows only `budget` syncs a day, spread over the day
 * (2 of 8/12/18/23 gives 8 and 18). Null or a budget covering every slot keeps them all.
 */
export function slotsForBudget(budget: number | null, hours: number[] = BANK_SYNC_HOURS): number[] {
  const sorted = [...hours].sort((a, b) => a - b);
  if (budget == null || budget >= sorted.length) return sorted;
  const n = Math.max(1, Math.floor(budget));
  return Array.from({ length: n }, (_, i) => sorted[Math.floor((i * sorted.length) / n)]);
}
