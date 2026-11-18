import { describe, expect, it } from "vitest";
import { buildAuthRequest, checkCallback, consentValidUntil, mapSessionAccounts, sessionValidUntil } from "./link";

const now = new Date("2026-11-18T10:00:00Z");
const DAY = 86_400;

describe("consentValidUntil", () => {
  it("uses the bank's maximum, capped at 180 days, one minute short", () => {
    expect(consentValidUntil(now, 180 * DAY).toISOString()).toBe("2027-05-17T09:59:00.000Z");
    expect(consentValidUntil(now, 365 * DAY).toISOString()).toBe("2027-05-17T09:59:00.000Z");
    expect(consentValidUntil(now, 30 * DAY).toISOString()).toBe("2026-12-18T09:59:00.000Z");
  });

  it("falls back to 90 days when unknown", () => {
    expect(consentValidUntil(now, null).toISOString()).toBe("2027-02-16T09:59:00.000Z");
  });
});

describe("buildAuthRequest", () => {
  it("asks for a personal consent in Italian", () => {
    const req = buildAuthRequest({ aspspName: "Mock ASPSP", country: "it", state: "s", redirectUrl: "http://x/cb", validUntil: now });
    expect(req).toEqual({
      access: { valid_until: "2026-11-18T10:00:00.000Z" },
      aspsp: { name: "Mock ASPSP", country: "IT" },
      state: "s",
      redirect_url: "http://x/cb",
      psu_type: "personal",
      language: "it",
    });
  });
});

describe("checkCallback", () => {
  const params = { code: "c", state: "s", error: null, errorDescription: null };

  it("accepts a matching state with a code", () => {
    expect(checkCallback(params, "s")).toEqual({ ok: true, code: "c" });
  });

  it("rejects a missing or different state before anything else", () => {
    expect(checkCallback(params, null)).toEqual({ ok: false, reason: "state" });
    expect(checkCallback({ ...params, error: "access_denied" }, "x")).toEqual({ ok: false, reason: "state" });
  });

  it("reports a denied consent and a missing code", () => {
    expect(checkCallback({ ...params, code: null, error: "access_denied" }, "s")).toEqual({ ok: false, reason: "denied" });
    expect(checkCallback({ ...params, code: null }, "s")).toEqual({ ok: false, reason: "missing" });
  });
});

describe("mapSessionAccounts", () => {
  it("masks the IBAN and picks a readable name", () => {
    const rows = mapSessionAccounts({
      session_id: "s",
      aspsp: { name: "Mock ASPSP", country: "IT" },
      accounts: [
        { uid: "u1", account_id: { iban: "IT60 X054 2811 1010 0000 0123 456" }, name: "Conto corrente", currency: "EUR" },
        { uid: "u2", product: "Carta", currency: null },
      ],
    });
    expect(rows).toEqual([
      { uid: "u1", name: "Conto corrente", iban_masked: "IT60 •••• 3456", currency: "EUR" },
      { uid: "u2", name: "Carta", iban_masked: null, currency: null },
    ]);
  });
});

describe("sessionValidUntil", () => {
  const session = { session_id: "s", accounts: [], aspsp: { name: "A", country: "IT" } };

  it("prefers the bank's date and falls back to the requested one", () => {
    expect(sessionValidUntil({ ...session, access: { valid_until: "2027-01-01T00:00:00+00:00" } }, now)).toBe("2027-01-01T00:00:00.000Z");
    expect(sessionValidUntil({ ...session, access: { valid_until: "nope" } }, now)).toBe(now.toISOString());
    expect(sessionValidUntil(session, now)).toBe(now.toISOString());
  });
});
