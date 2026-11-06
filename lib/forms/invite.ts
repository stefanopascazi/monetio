import { isMemberRole } from "../domain/household";
import type { MemberRole } from "../domain/types";
import { Checker, isUUID, type ParseResult, text } from "./parse";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (v: string) => v.trim().toLowerCase();
export const isValidEmail = (v: string) => EMAIL_RE.test(v);

export interface InviteInput {
  email: string;
  /** Existing member waiting for an account, or null to add a new one. */
  memberId: string | null;
  displayName: string | null;
  /** Role in the household; plain member when omitted. */
  role: MemberRole;
}

export function parseInviteForm(fd: FormData): ParseResult<InviteInput> {
  const email = normalizeEmail(text(fd, "email"));
  const memberId = text(fd, "memberId");
  const displayName = text(fd, "displayName");
  const role = text(fd, "role") || "member";
  return new Checker()
    .check(isValidEmail(email), "email", "Inserisci un'email valida")
    .check(!memberId || isUUID(memberId), "memberId", "Persona non valida")
    .check(!!memberId || (displayName.length > 0 && displayName.length <= 40), "displayName", "Scrivi il nome della persona")
    .check(isMemberRole(role), "role", "Ruolo non valido")
    .result({ email, memberId: memberId || null, displayName: memberId ? null : displayName, role: role as MemberRole });
}

/** Only same-site relative paths are allowed as post-auth redirects. */
export function safeNext(next: string | null, fallback = "/"): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
