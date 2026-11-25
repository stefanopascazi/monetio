// Decides whether a click on the page starts an in-app navigation (used for the tap feedback bar).

interface ClickLike {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
  target: EventTarget | null;
}

/** Target path+search of a same-origin link click that changes page; null for anything else. */
export function internalNavTarget(event: ClickLike, current: URL): string | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const el = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!(el instanceof HTMLAnchorElement)) return null;
  if ((el.target && el.target !== "_self") || el.hasAttribute("download")) return null;
  const url = new URL(el.getAttribute("href") ?? "", current);
  if (url.origin !== current.origin) return null;
  const next = url.pathname + url.search;
  // Same page (or a hash jump on it): Next does not navigate, the bar would never finish.
  return next === current.pathname + current.search ? null : next;
}
