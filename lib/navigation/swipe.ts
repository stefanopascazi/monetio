// Horizontal swipe detection for account navigation.
export const SWIPE_MIN_PX = 60;

/** "next" for a left swipe, "prev" for a right one; null when short or mostly vertical. */
export function swipeDirection(dx: number, dy: number, min = SWIPE_MIN_PX): "prev" | "next" | null {
  if (Math.abs(dx) < min || Math.abs(dx) < Math.abs(dy) * 1.5) return null;
  return dx < 0 ? "next" : "prev";
}
