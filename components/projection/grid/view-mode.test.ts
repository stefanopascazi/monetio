import { describe, expect, it } from "vitest";
import { readViewMode, VIEW_MODE_STORAGE_KEY, writeViewMode } from "./view-mode";

const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};

describe("view mode storage", () => {
  it("round-trips the grid choice and defaults to list", () => {
    const s = memory();
    expect(readViewMode(s)).toBe("list");
    writeViewMode("grid", s);
    expect(s.getItem(VIEW_MODE_STORAGE_KEY)).toBe("grid");
    expect(readViewMode(s)).toBe("grid");
  });

  it("falls back to list when storage throws or is missing", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readViewMode(broken)).toBe("list");
    expect(() => writeViewMode("grid", broken)).not.toThrow();
    expect(readViewMode(undefined)).toBe("list");
  });
});
