// Quiet hours: push is held until they end (the bell shows the notification at once).

const ROME = "Europe/Rome";
const HOUR_MS = 3_600_000;

/** Hour of the day (0-23) in Europe/Rome. */
export function romeHour(at: Date): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: ROME, hour: "2-digit", hourCycle: "h23" }).format(at));
}

/** Whether an hour falls in [start, end), wrapping midnight when start > end. */
export function inQuietHours(h: number, { start, end }: { start: number; end: number }): boolean {
  return start < end ? h >= start && h < end : h >= start || h < end;
}

/** When push may be sent: now, or the next `end:00` Rome time while quiet hours are on. */
export function pushAfter(now: Date, quiet: { start: number; end: number } | null): Date {
  if (!quiet || !inQuietHours(romeHour(now), quiet)) return now;
  // Rome offsets are whole hours: walk full hours until the window closes (DST-safe, at most 24 steps).
  let t = Math.floor(now.getTime() / HOUR_MS) * HOUR_MS;
  for (let i = 0; i < 25; i++) {
    t += HOUR_MS;
    if (!inQuietHours(romeHour(new Date(t)), quiet)) return new Date(t);
  }
  return now;
}
