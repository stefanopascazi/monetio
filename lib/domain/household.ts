// Household roles and active-household selection (pure, shared by server and UI).
import type { Member, MemberRole } from "./types";

export const MEMBER_ROLES: readonly MemberRole[] = ["admin", "member"];

export const ROLE_LABEL: Record<MemberRole, string> = { admin: "Amministratore", member: "Membro" };

export const isMemberRole = (v: unknown): v is MemberRole => typeof v === "string" && (MEMBER_ROLES as readonly string[]).includes(v);

export const isAdmin = (m: Pick<Member, "role"> | null | undefined) => m?.role === "admin";

/** Active admins (with an account): a household must always keep at least one. */
export const activeAdmins = (members: Member[]) => members.filter((m) => m.role === "admin" && m.userId);

/** True when removing or demoting this member would leave the household without an active admin. */
export function isLastAdmin(members: Member[], memberId: string): boolean {
  const admins = activeAdmins(members);
  return admins.length === 1 && admins[0].id === memberId;
}

export interface Membership {
  householdId: string;
  householdName: string;
  role: MemberRole;
}

/** Picks the household chosen by the user (cookie) when still valid, else the first one. */
export function pickActiveHousehold<T extends Pick<Membership, "householdId">>(memberships: T[], preferredId: string | null | undefined): T | null {
  return memberships.find((m) => m.householdId === preferredId) ?? memberships[0] ?? null;
}

/** Italian copy for errors raised by the household guards in the database. */
export function householdErrorMessage(error: { code?: string; message?: string } | null): string | null {
  const msg = error?.message ?? "";
  if (/last admin/i.test(msg)) return "Il nucleo deve avere almeno un amministratore attivo.";
  if (/only admins/i.test(msg)) return "Solo un amministratore può farlo.";
  if (/already a member/i.test(msg)) return "Fai già parte di questo nucleo.";
  if (/invalid invite/i.test(msg)) return "Codice invito non valido.";
  // Private accounts need an owner (check constraint on accounts).
  if (error?.code === "23514" || /private_needs_owner/i.test(msg)) return "Questa persona ha conti privati: spostali o eliminali prima.";
  return null;
}

export interface MemberPermissions {
  /** Viewer may change this member's role. */
  canChangeRole: boolean;
  /** Viewer may remove this member from the household. */
  canRemove: boolean;
}

/** What the viewer can do on a member row: admins manage others; nobody can strand the household without admins. */
export function memberPermissions(viewer: Member, target: Member, members: Member[]): MemberPermissions {
  if (!isAdmin(viewer) || viewer.id === target.id) return { canChangeRole: false, canRemove: false };
  const last = isLastAdmin(members, target.id);
  return { canChangeRole: !last, canRemove: !last };
}
