/** Paths reachable without a session. */
// /api/cron and /api/debug check their own bearer secret; /api/health is the uptime probe.
// /privacy and /terms-of-use are linked from the Enable Banking application and must stay reachable by its reviewers.
export const PUBLIC_PATHS = ["/login", "/auth", "/privacy", "/terms-of-use", "/api/cron", "/api/debug", "/api/health"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
