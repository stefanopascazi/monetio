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

/** Valid `YYYY-MM-DD` calendar date from a param, or undefined. */
export function dateParam(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : undefined;
}

/** Rows added by each "Mostra altri" on paged lists. */
export const PAGE_STEP = 50;

/** Rows to show from a `n` param: a positive multiple of `step`, capped at `max`. */
export function pageSizeParam(v: string | string[] | undefined, step = PAGE_STEP, max = 1000): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  if (!Number.isFinite(n) || n < step) return step;
  return Math.min(Math.ceil(n / step) * step, max);
}

/** Free-text search without LIKE wildcards; undefined when nothing is left. */
export function searchTerm(v: string | undefined): string | undefined {
  const s = v?.replace(/[%_]/g, "").trim();
  return s || undefined;
}

/** First `limit` rows of a list fetched with one extra row, and whether more exist. */
export function takePage<T>(rows: T[], limit: number): { page: T[]; hasMore: boolean } {
  return { page: rows.slice(0, limit), hasMore: rows.length > limit };
}
