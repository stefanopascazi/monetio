// Desktop preference for the monthly detail: vertical list or spreadsheet grid. Phones always get the list.
export type DetailViewMode = "list" | "grid";

export const VIEW_MODE_STORAGE_KEY = "mio-projection-view";

/** Stored mode; list when missing, unknown or storage is blocked. */
export function readViewMode(storage: Pick<Storage, "getItem"> | undefined): DetailViewMode {
  try {
    return storage?.getItem(VIEW_MODE_STORAGE_KEY) === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

/** Persists the mode. Never throws. */
export function writeViewMode(mode: DetailViewMode, storage: Pick<Storage, "setItem"> | undefined): void {
  try {
    storage?.setItem(VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    /* storage unavailable: preference lasts for this page only */
  }
}
