import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { type Membership, pickActiveHousehold } from "../domain/household";
import type { Member } from "../domain/types";
import { sessionUser } from "../supabase/claims";
import { createClient } from "../supabase/server";
import { readActiveHouseholdId } from "./active-household";
import { mapMember } from "./mappers";

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
  // Session data is per request: never prerender past this point (dates are read later).
  await connection();
  const supabase = await createClient();
  // Local JWT verification: the proxy already refreshed the session on this request.
  const { data } = await supabase.auth.getClaims();
  const user = sessionUser(data?.claims);
  if (!user) redirect("/login");
  return user;
});

/**
 * Links pending members invited by email to the current user (one per household).
 * Blocking only on /benvenuto; elsewhere it runs alongside the read and shows up on the next request.
 */
export async function claimMemberships() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_membership");
  if (error) console.error("claim_membership failed", error.message);
}

/** Member rows of the current user (one per household), oldest first. */
export const listMemberships = cache(async () => {
  const user = await getUser();
  const supabase = await createClient();
  const [{ data }] = await Promise.all([
    supabase.from("household_members").select("*").eq("user_id", user.id).order("created_at"),
    claimMemberships(),
  ]);
  return data ?? [];
});

/** Member row of the current user in the active household. Null when the user has none. */
export const findMembership = cache(async () => {
  const rows = await listMemberships();
  const preferred = await readActiveHouseholdId();
  return pickActiveHousehold(rows.map((r) => ({ ...r, householdId: String(r.household_id) })), preferred);
});

/** Current user with the active household and its members (one request-scoped read). */
export const getContext = cache(async (): Promise<AppContext> => {
  const user = await getUser();
  const supabase = await createClient();
  const [rows, mine] = await Promise.all([listMemberships(), findMembership()]);
  if (!mine) redirect("/benvenuto");

  const [{ data: households }, { data: members }] = await Promise.all([
    supabase.from("households").select("id, name, invite_code").in("id", rows.map((r) => r.household_id)),
    supabase.from("household_members").select("*").eq("household_id", mine.householdId).order("created_at"),
  ]);
  const household = households?.find((h) => h.id === mine.householdId);
  if (!household) redirect("/benvenuto");

  const names = new Map((households ?? []).map((h) => [String(h.id), String(h.name)]));
  return {
    userId: user.id,
    email: user.email ?? null,
    householdId: household.id,
    householdName: household.name,
    inviteCode: household.invite_code,
    me: mapMember(mine),
    members: (members ?? []).map(mapMember),
    memberships: rows.map((r) => ({ householdId: String(r.household_id), householdName: names.get(String(r.household_id)) ?? "", role: mapMember(r).role })),
  };
});

/** Active household id, for scoping reads (RLS alone shows every household of the user). */
export async function activeHouseholdId(): Promise<string> {
  return (await getContext()).householdId;
}
