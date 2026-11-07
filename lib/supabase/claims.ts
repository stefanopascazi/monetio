export interface SessionUser {
  id: string;
  email: string | null;
}

/** Signed-in user from verified JWT claims (`auth.getClaims()`); null without a valid session. */
export function sessionUser(claims: { sub?: unknown; email?: unknown } | null | undefined): SessionUser | null {
  if (!claims || typeof claims.sub !== "string" || !claims.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" && claims.email ? claims.email : null };
}
