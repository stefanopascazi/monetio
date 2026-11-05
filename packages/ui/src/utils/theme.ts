// Theme preference handling: "system" follows prefers-color-scheme,
// "light"/"dark" force a theme through data-theme on <html>.
export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "mio-theme";
const VALID: ThemePreference[] = ["system", "light", "dark"];

export function isThemePreference(v: unknown): v is ThemePreference {
  return typeof v === "string" && (VALID as string[]).includes(v);
}

/** Reads the stored preference; falls back to "system" when missing or storage is blocked. */
export function readThemePreference(storage: Pick<Storage, "getItem"> | undefined = safeStorage()): ThemePreference {
  try {
    const v = storage?.getItem(THEME_STORAGE_KEY);
    return isThemePreference(v) ? v : "system";
  } catch {
    return "system";
  }
}

/** Persists the preference; "system" clears the key. Never throws. */
export function writeThemePreference(pref: ThemePreference, storage: Pick<Storage, "setItem" | "removeItem"> | undefined = safeStorage()): void {
  try {
    if (pref === "system") storage?.removeItem(THEME_STORAGE_KEY);
    else storage?.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    /* storage unavailable: preference lasts for this page only */
  }
}

/** Actual theme shown for a preference. */
export function resolveTheme(pref: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (pref === "system") return systemPrefersDark ? "dark" : "light";
  return pref;
}

/** Applies a preference to the root element. "system" removes data-theme so CSS media queries decide. */
export function applyThemePreference(pref: ThemePreference, root: HTMLElement = document.documentElement): void {
  if (pref === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", pref);
}

/**
 * Inline script for <head>: applies the stored preference before first paint (no theme flash).
 * Render it with dangerouslySetInnerHTML and add suppressHydrationWarning on <html>.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

function safeStorage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}
