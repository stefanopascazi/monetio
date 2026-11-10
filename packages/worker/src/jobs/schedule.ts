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
