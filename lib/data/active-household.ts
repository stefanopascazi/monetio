import "server-only";
import { cookies } from "next/headers";

// Household the user is currently working in (a user can belong to several).
const COOKIE = "mio-household";

export async function readActiveHouseholdId(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

/** Only callable from Server Actions or Route Handlers (cookies are read-only while rendering). */
export async function writeActiveHouseholdId(id: string | null): Promise<void> {
  const jar = await cookies();
  if (!id) jar.delete(COOKIE);
  else jar.set(COOKIE, id, { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365 });
}
