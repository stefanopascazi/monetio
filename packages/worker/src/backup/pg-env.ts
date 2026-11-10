import { sslFor } from "../../../../scripts/db/ssl.ts";

/**
 * libpq environment for pg_dump from a connection URL: keeps the password out of the
 * command line (visible in `ps`) and maps sslmode like the app's postgres.js client.
 */
export function pgEnvFromUrl(url: string): Record<string, string> {
  const u = new URL(url);
  return {
    PGHOST: u.hostname,
    PGPORT: u.port || "5432",
    PGUSER: decodeURIComponent(u.username),
    PGPASSWORD: decodeURIComponent(u.password),
    PGDATABASE: decodeURIComponent(u.pathname.slice(1)) || "postgres",
    PGSSLMODE: sslFor(url) ? "require" : "disable",
  };
}
