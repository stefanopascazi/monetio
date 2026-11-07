import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Membership } from "../domain/household";
import type { Member } from "../domain/types";
import { sessionUser } from "../supabase/claims";
import { createClient } from "../supabase/server";
import { readActiveHouseholdId } from "./active-household";
import { activeMembership, activeSession, sessionPayload } from "./session-context";

export interface AppContext {
  userId: string;
  email: string | null;
  householdId: string;
  householdName: string;
  inviteCode: string;
  me: Member;
  members: Member[];
  /** Every household of the user, for the switcher. */
  memberships: Membership[];
}

/** Signed-in user, without household checks. Redirects guests to /login. */
export const getUser = cache(async () => {
  // Reading the session cookies keeps this per request (no connection(): private caches forbid it).
  const supabase = await createClient();
  // Local JWT verification: the proxy already refreshed the session on this request.
  const { data } = await supabase.auth.getClaims();
  const user = sessionUser(data?.claims);
  if (!user) redirect("/login");
  return user;
});

/**
 * Member rows, households and members of the user in one round trip.
 * The RPC links pending invitations first, so new members land in the right household at once.
 */
const loadSession = cache(async () => {
  await getUser();
  const supabase = await createClient();
  const [{ data, error }, preferred] = await Promise.all([supabase.rpc("session_context"), readActiveHouseholdId()]);
  if (error) throw error;
  return { payload: sessionPayload(data), preferred };
});

/** Member rows of the current user (one per household), oldest first. */
export const listMemberships = cache(async () => (await loadSession()).payload.memberships);

/** Member row of the current user in the active household. Null when the user has none. */
export const findMembership = cache(async () => {
  const { payload, preferred } = await loadSession();
  return activeMembership(payload, preferred);
});

/** Current user with the active household and its members (one request-scoped read). */
export const getContext = cache(async (): Promise<AppContext> => {
  const [user, { payload, preferred }] = await Promise.all([getUser(), loadSession()]);
  const session = activeSession(payload, preferred);
  if (!session) redirect("/benvenuto");
  return { userId: user.id, email: user.email, ...session };
});

/** Active household id, for scoping reads (RLS alone shows every household of the user). */
export async function activeHouseholdId(): Promise<string> {
  return (await getContext()).householdId;
}
