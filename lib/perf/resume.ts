// When the app returns to the foreground after a long pause, the rendered data may be stale.
export const RESUME_REFRESH_MS = 5 * 60_000;

export function shouldRefreshOnResume(hiddenAt: number | null, now: number, threshold = RESUME_REFRESH_MS): boolean {
  return hiddenAt !== null && now - hiddenAt >= threshold;
}
