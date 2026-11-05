import { afterEach, describe, expect, it } from "vitest";
import {
  THEME_STORAGE_KEY,
  applyThemePreference,
  isThemePreference,
  readThemePreference,
  resolveTheme,
  themeInitScript,
  writeThemePreference,
} from "./theme";

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("theme utils", () => {
  it("validates preferences", () => {
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("blue")).toBe(false);
  });

  it("reads and writes storage, system clears the key", () => {
    expect(readThemePreference()).toBe("system");
    writeThemePreference("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(readThemePreference()).toBe("dark");
    writeThemePreference("system");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("survives blocked storage", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {},
    };
    expect(readThemePreference(broken)).toBe("system");
    expect(() => writeThemePreference("light", broken)).not.toThrow();
  });

  it("resolves the effective theme", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
  });

  it("applies data-theme only for explicit choices", () => {
    applyThemePreference("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    applyThemePreference("system");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("init script applies the stored theme", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    new Function(themeInitScript)();
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
