// Pure shaping of the `session_context()` RPC payload into the request context.
import { type Membership, pickActiveHousehold } from "../domain/household";
import type { Member } from "../domain/types";
import { mapMember } from "./mappers";

type Row = Record<string, unknown>;

export interface SessionPayload {
  memberships: Row[];
  households: { id: string; name: string; invite_code: string }[];
  members: Row[];
}

export interface ActiveSession {
  householdId: string;
  householdName: string;
  inviteCode: string;
  me: Member;
  members: Member[];
  memberships: Membership[];
}

/** Normalizes a missing or partial payload (e.g. RPC error) to empty lists. */
export function sessionPayload(data: unknown): SessionPayload {
  const d = (data ?? {}) as Partial<SessionPayload>;
  return { memberships: d.memberships ?? [], households: d.households ?? [], members: d.members ?? [] };
}

/** Member row of the active household: the preferred one when still valid, else the oldest. */
export function activeMembership(p: SessionPayload, preferredId: string | null) {
  return pickActiveHousehold(
    p.memberships.map((r) => ({ ...r, householdId: String(r.household_id) })),
    preferredId,
  );
}

/** Active household with its members; null when the user has no household (or it vanished). */
export function activeSession(p: SessionPayload, preferredId: string | null): ActiveSession | null {
  const mine = activeMembership(p, preferredId);
  if (!mine) return null;
  const household = p.households.find((h) => String(h.id) === mine.householdId);
  if (!household) return null;
  const names = new Map(p.households.map((h) => [String(h.id), String(h.name)]));
  return {
    householdId: mine.householdId,
    householdName: String(household.name),
    inviteCode: String(household.invite_code),
    me: mapMember(mine),
    members: p.members.filter((m) => String(m.household_id) === mine.householdId).map(mapMember),
    memberships: p.memberships.map((r) => ({
      householdId: String(r.household_id),
      householdName: names.get(String(r.household_id)) ?? "",
      role: mapMember(r).role,
    })),
  };
}
