import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearNavLog, NAV_LOG_KEY, NAV_LOG_MAX, navStats, readNavLog, recordNav, resetNavLogCache, subscribeNavLog } from "./nav-log";

const entry = (ms: number, at = ms) => ({ at, path: `/p${ms}`, ms, standalone: true, controlled: true });

beforeEach(() => {
  localStorage.clear();
  resetNavLogCache();
});

describe("nav log", () => {
  it("keeps newest first, capped, persisted and notifies listeners", () => {
    const listener = vi.fn();
    const off = subscribeNavLog(listener);
    for (let i = 1; i <= NAV_LOG_MAX + 5; i++) recordNav(entry(i));
    off();
    expect(listener).toHaveBeenCalledTimes(NAV_LOG_MAX + 5);
    expect(readNavLog()).toHaveLength(NAV_LOG_MAX);
    expect(readNavLog()[0].ms).toBe(NAV_LOG_MAX + 5);
    resetNavLogCache();
    expect(readNavLog()[0].ms).toBe(NAV_LOG_MAX + 5);
  });

  it("survives corrupted storage and clears", () => {
    localStorage.setItem(NAV_LOG_KEY, "{bad");
    expect(readNavLog()).toEqual([]);
    recordNav(entry(10));
    clearNavLog();
    expect(readNavLog()).toEqual([]);
  });

  it("computes median and max", () => {
    expect(navStats([])).toBeNull();
    expect(navStats([entry(300), entry(100), entry(200)])).toEqual({ median: 200, max: 300 });
    expect(navStats([entry(100), entry(400)])).toEqual({ median: 250, max: 400 });
  });
});
