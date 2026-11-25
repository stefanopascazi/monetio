// On-device navigation log for the diagnostics card: tap-to-render times survive reloads via localStorage.

export interface NavEntry {
  /** Epoch ms of the tap. */
  at: number;
  path: string;
  /** Tap to rendered route, ms. */
  ms: number;
  standalone: boolean;
  /** Page controlled by the service worker. */
  controlled: boolean;
}

export const NAV_LOG_KEY = "monetio:nav-log";
export const NAV_LOG_MAX = 30;

const listeners = new Set<() => void>();
let cache: NavEntry[] | null = null;

function load(): NavEntry[] {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(NAV_LOG_KEY) ?? "[]");
    cache = Array.isArray(raw) ? raw : [];
  } catch {
    cache = [];
  }
  return cache;
}

function save(list: NavEntry[]) {
  cache = list;
  try {
    localStorage.setItem(NAV_LOG_KEY, JSON.stringify(list));
  } catch {
    // Storage unavailable: keep the in-memory log only.
  }
  listeners.forEach((l) => l());
}

/** Newest first. */
export const readNavLog = (): NavEntry[] => load();

export function recordNav(entry: NavEntry) {
  save([entry, ...load()].slice(0, NAV_LOG_MAX));
}

export function clearNavLog() {
  save([]);
}

export function subscribeNavLog(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Median and slowest tap-to-render time, null when the log is empty. */
export function navStats(list: NavEntry[]): { median: number; max: number } | null {
  if (!list.length) return null;
  const sorted = list.map((e) => e.ms).sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  const median = sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  return { median, max: sorted[sorted.length - 1] };
}

/** Test hook: forget the in-memory copy. */
export function resetNavLogCache() {
  cache = null;
}
