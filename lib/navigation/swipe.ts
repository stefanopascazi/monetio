// Horizontal swipe detection for account navigation.
export const SWIPE_MIN_PX = 60;

/** "next" for a left swipe, "prev" for a right one; null when short or mostly vertical. */
export function swipeDirection(dx: number, dy: number, min = SWIPE_MIN_PX): "prev" | "next" | null {
  if (Math.abs(dx) < min || Math.abs(dx) < Math.abs(dy) * 1.5) return null;
  return dx < 0 ? "next" : "prev";
}

/** True when the touch starts inside an element that scrolls horizontally (tables, charts), up to `root`. */
export function startsInHorizontalScroller(target: Element | null, root: Element): boolean {
  for (let el = target; el && el !== root; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth && /auto|scroll/.test(getComputedStyle(el).overflowX)) return true;
  }
  return false;
}
