// Pure helpers for database connection options.

/** TLS is required (Supabase cloud) unless the URL opts out with `sslmode=disable` (local Docker stack). */
export function sslFor(url: string): "require" | false {
  return /[?&]sslmode=disable(&|$)/.test(url) ? false : "require";
}

/** Strips query params postgres.js does not understand (sslmode is mapped to the `ssl` option). */
export function cleanUrl(url: string): string {
  return url.replace(/[?&](sslmode|supa|pgbouncer)=[^&]*/g, "").replace(/\?$/, "");
}
