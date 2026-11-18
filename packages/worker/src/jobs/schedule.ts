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

/** Like dailyDue with several slots a day (UTC hours): due when it has not succeeded since the latest slot. */
export function slotsDue(hoursUtc: number[]): (lastSuccess: Date | null, now: Date) => boolean {
  const sorted = [...hoursUtc].sort((a, b) => a - b);
  return (lastSuccess, now) => {
    if (lastSuccess === null) return true;
    const passed = sorted.filter((h) => h <= now.getUTCHours());
    const slot = passed.length
      ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), passed.at(-1)))
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, sorted.at(-1)));
    return lastSuccess < slot;
  };
}
