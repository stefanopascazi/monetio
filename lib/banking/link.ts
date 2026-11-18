// Pure steps of linking a bank: consent length, auth request, callback check, session mapping.
import { maskIban, normalizeIban } from "./identifiers.ts";
import type { AuthRequest, SessionResponse } from "./enable-banking/types.ts";

const DAY_MS = 86_400_000;
/** Most Italian banks accept 180 days; used when the bank does not state its maximum. */
export const DEFAULT_CONSENT_DAYS = 90;
export const MAX_CONSENT_DAYS = 180;

/** Consent end: the bank's maximum (capped at 180 days), a minute short to avoid edge rejections. */
export function consentValidUntil(now: Date, maxSeconds?: number | null): Date {
  const days = maxSeconds && maxSeconds > 0 ? Math.min(Math.floor(maxSeconds / 86_400), MAX_CONSENT_DAYS) : DEFAULT_CONSENT_DAYS;
  return new Date(now.getTime() + days * DAY_MS - 60_000);
}

export function buildAuthRequest(input: { aspspName: string; country: string; state: string; redirectUrl: string; validUntil: Date }): AuthRequest {
  return {
    access: { valid_until: input.validUntil.toISOString() },
    aspsp: { name: input.aspspName, country: input.country.toUpperCase() },
    state: input.state,
    redirect_url: input.redirectUrl,
    psu_type: "personal",
    language: "it",
  };
}

export type CallbackParams = { code: string | null; state: string | null; error: string | null; errorDescription: string | null };

export type CallbackCheck = { ok: true; code: string } | { ok: false; reason: "denied" | "state" | "missing" };

/** The state must match the cookie set when the flow started (CSRF and mix-up protection). */
export function checkCallback(params: CallbackParams, expectedState: string | null): CallbackCheck {
  if (!expectedState || params.state !== expectedState) return { ok: false, reason: "state" };
  if (params.error) return { ok: false, reason: "denied" };
  if (!params.code) return { ok: false, reason: "missing" };
  return { ok: true, code: params.code };
}

export type LinkedAccountRow = { uid: string; name: string | null; iban_masked: string | null; currency: string | null };

/** Accounts as stored: the IBAN only masked, a readable name. */
export function mapSessionAccounts(session: SessionResponse): LinkedAccountRow[] {
  return (session.accounts ?? []).map((a) => {
    const iban = a.account_id?.iban ? normalizeIban(a.account_id.iban) : null;
    return {
      uid: a.uid,
      name: (a.name || a.product || a.details || null)?.slice(0, 120) ?? null,
      iban_masked: iban ? maskIban(iban) : null,
      currency: a.currency ?? null,
    };
  });
}

/** Session end as stored: the bank's answer, else what was requested. */
export function sessionValidUntil(session: SessionResponse, requested: Date): string {
  const v = session.access?.valid_until;
  return v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : requested.toISOString();
}
