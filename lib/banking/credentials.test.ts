// @vitest-environment node
import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { prepareBankCredentials, toEnvironment } from "./credentials";
import { EnableBankingError } from "./enable-banking/client";
import { openSecret } from "./secrets";

const masterKey = randomBytes(32);
const input = { userId: "user-1", appId: "app-12345678", privateKeyPem: "PEM" };
const now = () => new Date("2026-11-18T10:00:00Z");

const clientReturning = (getApplication: () => Promise<Record<string, unknown>>) => vi.fn(() => ({ getApplication }));

describe("toEnvironment", () => {
  it("maps the API values", () => {
    expect(toEnvironment("SANDBOX")).toBe("sandbox");
    expect(toEnvironment("PRODUCTION")).toBe("production");
    expect(toEnvironment("other")).toBeNull();
  });
});

describe("prepareBankCredentials", () => {
  it("verifies the app and seals the key bound to the user", async () => {
    const createClient = clientReturning(async () => ({ name: "MonetIO-dev", environment: "SANDBOX" }));
    const res = await prepareBankCredentials(input, { masterKey, createClient, now });
    expect(createClient).toHaveBeenCalledWith({ appId: "app-12345678", privateKeyPem: "PEM" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.row).toMatchObject({ user_id: "user-1", environment: "sandbox", app_id: "app-12345678", app_name: "MonetIO-dev", verified_at: "2026-11-18T10:00:00.000Z" });
    expect(res.row.private_key_sealed).not.toContain("PEM");
    expect(openSecret(res.row.private_key_sealed, masterKey, "user-1")).toBe("PEM");
  });

  it("explains a rejected id/key pair", async () => {
    const res = await prepareBankCredentials(input, { masterKey, createClient: clientReturning(async () => Promise.reject(new EnableBankingError(401, "x"))) });
    expect(res).toEqual({ ok: false, message: expect.stringContaining("non riconosce") });
  });

  it("reports network or server errors separately", async () => {
    const res = await prepareBankCredentials(input, { masterKey, createClient: clientReturning(async () => Promise.reject(new Error("ECONNRESET"))) });
    expect(res).toEqual({ ok: false, message: expect.stringContaining("non risponde") });
  });

  it("rejects an unknown environment", async () => {
    const res = await prepareBankCredentials(input, { masterKey, createClient: clientReturning(async () => ({ environment: "?" })) });
    expect(res.ok).toBe(false);
  });
});
