import { afterEach, describe, expect, it, vi } from "vitest";
import { collectSnapshot, isStandalone } from "./runtime";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runtime snapshot", () => {
  it("detects standalone display mode", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q === "(display-mode: standalone)" }));
    expect(isStandalone()).toBe(true);
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    expect(isStandalone()).toBe(false);
  });

  it("counts Cache Storage entries and tolerates blocked storage", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    vi.stubGlobal("caches", {
      keys: async () => ["a", "b"],
      open: async (n: string) => ({ keys: async () => (n === "a" ? [1, 2] : [3]) }),
    });
    const snap = await collectSnapshot();
    expect(snap).toMatchObject({ standalone: false, controlled: false, cacheEntries: 3, longTasks: { count: 0, ms: 0 } });
    vi.stubGlobal("caches", { keys: async () => Promise.reject(new Error("blocked")) });
    expect((await collectSnapshot()).cacheEntries).toBeNull();
  });
});
