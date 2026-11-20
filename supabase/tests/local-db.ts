const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1", "host.docker.internal"]);

/**
 * Database URL for SQL tests, or null. Tests write (inside rolled-back transactions), so they run only
 * when explicitly enabled (MONETIO_DB_TESTS=1, set by npm run test:db) and only against a local host:
 * Vercel builds expose the production URL and must never reach it.
 */
export function localTestDbUrl(env: Record<string, string | undefined>): string | null {
  if (env.MONETIO_DB_TESTS !== "1") return null;
  const url = env.POSTGRES_URL_NON_POOLING ?? env.POSTGRES_URL;
  if (!url) return null;
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname) ? url : null;
  } catch {
    return null;
  }
}
