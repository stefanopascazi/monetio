// Search-param parsing for list pages.

/** `YYYY-MM` from a param, falling back to `fallback`. */
export function monthParam(v: string | string[] | undefined, fallback: string): string {
  const s = Array.isArray(v) ? v[0] : v;
  return s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s) ? s : fallback;
}

/** Year from a param within [min, max], falling back to `fallback`. */
export function yearParam(v: string | string[] | undefined, fallback: number, min = 1990, max = 2100): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

export function stringParam(v: string | string[] | undefined): string | undefined {
  const s = (Array.isArray(v) ? v[0] : v)?.trim();
  return s || undefined;
}

/** Builds `path?query` keeping only defined values. */
export function withQuery(path: string, query: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}
