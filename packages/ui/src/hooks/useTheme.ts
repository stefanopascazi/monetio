"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
  applyThemePreference,
  readThemePreference,
  resolveTheme,
  writeThemePreference,
} from "../utils/theme";

const QUERY = "(prefers-color-scheme: dark)";

// Preference store: localStorage is the source of truth; listeners re-read it on change.
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function subscribePreference(onChange: () => void) {
  listeners.add(onChange);
  // Keep other tabs in sync.
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY || e.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function subscribeSystem(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const systemDark = () => typeof window.matchMedia === "function" && window.matchMedia(QUERY).matches;

/** Theme preference (system / light / dark), persisted and applied to <html>; tracks OS changes. */
export function useTheme() {
  // Server snapshot is "system"/light; the inline init script already painted the stored theme.
  const preference = useSyncExternalStore<ThemePreference>(subscribePreference, () => readThemePreference(), () => "system");
  const prefersDark = useSyncExternalStore(subscribeSystem, systemDark, () => false);

  const setPreference = useCallback((pref: ThemePreference) => {
    applyThemePreference(pref);
    writeThemePreference(pref);
    notify();
  }, []);

  const resolved: ResolvedTheme = resolveTheme(preference, prefersDark);
  return { preference, resolved, setPreference };
}
