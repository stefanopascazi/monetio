// Remembers the last opened account: written client-side by the statement page, read by /conti.
export const LAST_ACCOUNT_COOKIE = "mio-last-account";
export const LAST_ACCOUNT_MAX_AGE = 60 * 60 * 24 * 365;

/** Cookie string storing the last opened account. */
export function lastAccountCookie(id: string): string {
  return `${LAST_ACCOUNT_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${LAST_ACCOUNT_MAX_AGE}; samesite=lax`;
}
