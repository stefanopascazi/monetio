import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "../supabase/server";
import { mapMember } from "./mappers";
import type { Member } from "../domain/types";

export interface AppContext {
  userId: string;
  email: string | null;
  householdId: string;
  householdName: string;
  inviteCode: string;
  me: Member;
  members: Member[];
}

/** Signed-in user, without household checks. Redirects guests to /login. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
});

/**
 * Current user with household and members (one request-scoped read).
 * Links a pre-created member by email on first login; users without a household go to onboarding.
 */
export const getContext = cache(async (): Promise<AppContext> => {
  const user = await getUser();
  const supabase = await createClient();
  let { data: mine } = await supabase.from("household_members").select("*").eq("user_id", user.id).maybeSingle();
  if (!mine) {
    await supabase.rpc("claim_membership");
    ({ data: mine } = await supabase.from("household_members").select("*").eq("user_id", user.id).maybeSingle());
  }
  if (!mine) redirect("/benvenuto");

  const [{ data: household }, { data: members }] = await Promise.all([
    supabase.from("households").select("id, name, invite_code").eq("id", mine.household_id).single(),
    supabase.from("household_members").select("*").eq("household_id", mine.household_id).order("created_at"),
  ]);
  if (!household) redirect("/benvenuto");

  return {
    userId: user.id,
    email: user.email ?? null,
    householdId: household.id,
    householdName: household.name,
    inviteCode: household.invite_code,
    me: mapMember(mine),
    members: (members ?? []).map(mapMember),
  };
});
