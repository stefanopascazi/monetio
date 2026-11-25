// Runtime facts for the diagnostics card: display mode, service worker, main-thread blocking, memory, caches.

let longTaskMs = 0;
let longTaskCount = 0;
let observing = false;

/** Starts counting main-thread long tasks (Chromium only); safe to call more than once. */
export function observeLongTasks() {
  if (observing || typeof PerformanceObserver === "undefined") return;
  if (!PerformanceObserver.supportedEntryTypes?.includes("longtask")) return;
  observing = true;
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      longTaskCount += 1;
      longTaskMs += e.duration;
    }
  }).observe({ type: "longtask", buffered: true });
}

export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches === true;
}

export const isSwControlled = (): boolean => !!navigator.serviceWorker?.controller;

export interface RuntimeSnapshot {
  standalone: boolean;
  controlled: boolean;
  longTasks: { count: number; ms: number };
  /** Used JS heap in MB (Chromium only). */
  heapMb: number | null;
  /** Entries across all Cache Storage caches. */
  cacheEntries: number | null;
  /** Seconds since the page was loaded. */
  uptimeS: number;
}

async function countCacheEntries(): Promise<number | null> {
  if (typeof caches === "undefined") return null;
  try {
    const names = await caches.keys();
    const sizes = await Promise.all(names.map(async (n) => (await (await caches.open(n)).keys()).length));
    return sizes.reduce((a, b) => a + b, 0);
  } catch {
    return null;
  }
}

export async function collectSnapshot(): Promise<RuntimeSnapshot> {
  const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return {
    standalone: isStandalone(),
    controlled: isSwControlled(),
    longTasks: { count: longTaskCount, ms: Math.round(longTaskMs) },
    heapMb: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null,
    cacheEntries: await countCacheEntries(),
    uptimeS: Math.round(performance.now() / 1000),
  };
}
