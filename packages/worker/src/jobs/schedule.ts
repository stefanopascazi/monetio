/**
 * Daily job gate: due once per day after `hourUtc`. The latest slot is today's at `hourUtc`
 * (or yesterday's before that hour); the job is due when it has not succeeded since that slot.
 */
export function dailyDue(hourUtc: number): (lastSuccess: Date | null, now: Date) => boolean {
  return (lastSuccess, now) => {
    const slot = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourUtc));
    if (slot > now) slot.setUTCDate(slot.getUTCDate() - 1);
    return lastSuccess === null || lastSuccess < slot;
  };
}

/** Offset of `timeZone` from UTC at `instant`, in ms (e.g. +3_600_000 for Rome in winter). */
function zoneOffsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" })
    .formatToParts(new Date(instant))
    .reduce<Record<string, number>>((acc, p) => (p.type === "literal" ? acc : { ...acc, [p.type]: Number(p.value) }), {});
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - Math.floor(instant / 1000) * 1000;
}

/** Calendar date (y, m0, d) of `instant` in `timeZone`. */
function zonedDate(instant: number, timeZone: string): [number, number, number] {
  const d = new Date(instant + zoneOffsetMs(instant, timeZone));
  return [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];
}

/** UTC instant of a wall-clock hour in `timeZone`; the second pass settles DST-change days. */
function zonedInstant(y: number, m0: number, d: number, hour: number, timeZone: string): Date {
  const wall = Date.UTC(y, m0, d, hour);
  const first = wall - zoneOffsetMs(wall, timeZone);
  return new Date(wall - zoneOffsetMs(first, timeZone));
}

/**
 * Like dailyDue with several slots a day, as wall-clock hours in `timeZone` (DST-aware):
 * due when it has not succeeded since the latest slot.
 */
export function slotsDue(hours: number[], timeZone = "UTC"): (lastSuccess: Date | null, now: Date) => boolean {
  const sorted = [...hours].sort((a, b) => a - b);
  return (lastSuccess, now) => {
    if (lastSuccess === null) return true;
    const [y, m0, d] = zonedDate(now.getTime(), timeZone);
    const today = sorted.map((h) => zonedInstant(y, m0, d, h, timeZone)).filter((t) => t <= now);
    const slot = today.at(-1) ?? zonedInstant(y, m0, d - 1, sorted.at(-1)!, timeZone);
    return lastSuccess < slot;
  };
}
