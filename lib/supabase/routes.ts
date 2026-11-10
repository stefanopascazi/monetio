/** Paths reachable without a session. */
// /api/cron checks its own bearer secret; /api/health is the uptime probe.
export const PUBLIC_PATHS = ["/login", "/auth", "/api/cron", "/api/health"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
