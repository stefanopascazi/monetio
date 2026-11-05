/** Paths reachable without a session. */
// /api/cron checks its own bearer secret.
export const PUBLIC_PATHS = ["/login", "/auth", "/api/cron"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
