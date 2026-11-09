"use client";

import { useSyncExternalStore } from "react";
import { type DetailViewMode, readViewMode, writeViewMode } from "./view-mode";

const CHANGE_EVENT = "mio-projection-view-change";
// Choice made in this page: still honoured when storage is blocked.
let chosen: DetailViewMode | null = null;

const storage = () => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

// Re-read on own changes and on changes made in other tabs.
function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Remembered desktop view; list on the server and when storage is unavailable. */
export function useViewMode(): [DetailViewMode, (m: DetailViewMode) => void] {
  const mode = useSyncExternalStore(
    subscribe,
    () => chosen ?? readViewMode(storage()),
    () => "list" as const,
  );
  const change = (m: DetailViewMode) => {
    chosen = m;
    writeViewMode(m, storage());
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };
  return [mode, change];
}
