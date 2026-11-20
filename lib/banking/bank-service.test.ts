// @vitest-environment node
import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { BankSetupMissing, createBankService, type BankStore } from "./bank-service";
import { openSecret, sealSecret } from "./secrets";

const masterKey = randomBytes(32);
const now = () => new Date("2026-11-18T10:00:00Z");
const DAY = 86_400;

const pendingTarget = {
  bankAccountId: "ba1",
  uid: "u1",
  userId: "user-1",
  householdId: "h1",
  accountId: "acc1",
  openingDate: "2026-01-01" as const,
  syncFrom: null,
  lastSyncedAt: null,
  connectionCreatedAt: new Date("2026-11-18T09:00:00Z"),
};

function setup(overrides: Partial<BankStore> = {}) {
  const client = {
    listAspsps: vi.fn(async () => [{ name: "Mock ASPSP", country: "IT", maximum_consent_validity: 180 * DAY }]),
    startAuth: vi.fn(async () => ({ url: "https://bank.example/consent" })),
    createSession: vi.fn(async () => ({
      session_id: "sess-1",
      aspsp: { name: "Mock ASPSP", country: "it" },
      access: { valid_until: "2027-05-17T09:59:00Z" },
      accounts: [{ uid: "u1", name: "Conto", currency: "EUR" }],
    })),
    deleteSession: vi.fn(async () => ({})),
    getBalances: vi.fn(async () => []),
    getTransactions: vi.fn(async () => []),
  };
  const store: BankStore = {
    loadCredentials: vi.fn(async () => ({ app_id: "app-1", private_key_sealed: sealSecret("PEM", masterKey, "user-1") })),
    insertConnection: vi.fn(async () => {}),
    loadConnection: vi.fn(async () => ({ id: "c1", session_id_sealed: sealSecret("sess-1", masterKey, "user-1") })),
    deleteConnection: vi.fn(async () => {}),
    loadPendingSyncTarget: vi.fn(async () => pendingTarget),
    ...overrides,
  };
  const createClient = vi.fn(() => client);
  return { client, store, createClient, service: createBankService({ masterKey, store, createClient, now }) };
}

describe("bank service", () => {
  it("opens the person's key to build the client", async () => {
    const { service, createClient } = setup();
    await service.listBanks("user-1", "IT");
    expect(createClient).toHaveBeenCalledWith({ appId: "app-1", privateKeyPem: "PEM" });
  });

  it("fails clearly without a saved app", async () => {
    const { service } = setup({ loadCredentials: vi.fn(async () => null) });
    await expect(service.listBanks("user-1", "IT")).rejects.toBeInstanceOf(BankSetupMissing);
  });

  it("starts a link for a bank offered to the app, with a random state", async () => {
    const { service, client } = setup();
    const res = await service.startLink({ userId: "user-1", aspspName: "Mock ASPSP", country: "IT", redirectUrl: "http://x/cb" });
    expect(res).toMatchObject({ ok: true, url: "https://bank.example/consent" });
    if (!res.ok) return;
    expect(res.state.length).toBeGreaterThanOrEqual(32);
    expect(client.startAuth).toHaveBeenCalledWith(
      expect.objectContaining({ state: res.state, redirect_url: "http://x/cb", access: { valid_until: "2027-05-17T09:59:00.000Z" } }),
    );
  });

  it("refuses a bank the app does not offer", async () => {
    const { service, client } = setup();
    expect(await service.startLink({ userId: "user-1", aspspName: "Altro", country: "IT", redirectUrl: "http://x/cb" })).toMatchObject({ ok: false });
    expect(client.startAuth).not.toHaveBeenCalled();
  });

  it("stores the consent with a sealed session id and its accounts", async () => {
    const { service, store } = setup();
    expect(await service.completeLink({ userId: "user-1", householdId: "h1", code: "code" })).toBe(1);
    const [row, accounts] = vi.mocked(store.insertConnection).mock.calls[0];
    expect(row).toMatchObject({ user_id: "user-1", household_id: "h1", aspsp_name: "Mock ASPSP", aspsp_country: "IT", valid_until: "2027-05-17T09:59:00.000Z" });
    expect(row.session_id_sealed).not.toContain("sess-1");
    expect(openSecret(row.session_id_sealed, masterKey, "user-1")).toBe("sess-1");
    expect(accounts).toEqual([{ uid: "u1", name: "Conto", iban_masked: null, currency: "EUR" }]);
  });

  it("revokes and does not store a consent without accounts", async () => {
    const { service, client, store } = setup();
    client.createSession.mockResolvedValueOnce({ session_id: "sess-2", aspsp: { name: "Mock ASPSP", country: "IT" }, access: { valid_until: "2027-05-17T09:59:00Z" }, accounts: [] });
    expect(await service.completeLink({ userId: "user-1", householdId: "h1", code: "code" })).toBe(0);
    expect(store.insertConnection).not.toHaveBeenCalled();
    expect(client.deleteSession).toHaveBeenCalledWith("sess-2");
  });

  it("returns 0 even when revoking an empty consent fails", async () => {
    const { service, client, store } = setup();
    client.createSession.mockResolvedValueOnce({ session_id: "sess-2", aspsp: { name: "Mock ASPSP", country: "IT" }, access: { valid_until: "2027-05-17T09:59:00Z" }, accounts: [] });
    client.deleteSession.mockRejectedValueOnce(new Error("gone"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await service.completeLink({ userId: "user-1", householdId: "h1", code: "code" })).toBe(0);
    expect(store.insertConnection).not.toHaveBeenCalled();
  });

  it("revokes the session and deletes the link even when the bank call fails", async () => {
    const { service, client, store } = setup();
    client.deleteSession.mockRejectedValueOnce(new Error("gone"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await service.removeLink({ userId: "user-1", connectionId: "c1" })).toBe(true);
    expect(client.deleteSession).toHaveBeenCalledWith("sess-1");
    expect(store.deleteConnection).toHaveBeenCalledWith("c1");
  });

  it("does nothing for a connection that is not the caller's", async () => {
    const { service, store } = setup({ loadConnection: vi.fn(async () => null) });
    expect(await service.removeLink({ userId: "user-1", connectionId: "c9" })).toBe(false);
    expect(store.deleteConnection).not.toHaveBeenCalled();
  });

  it("builds the preview context with PSU headers for a pending account", async () => {
    const { service, createClient } = setup();
    const psu = { ipAddress: "203.0.113.5", userAgent: "UA" };
    const ctx = await service.previewContext({ userId: "user-1", bankAccountId: "ba1", psu });
    expect(ctx?.target).toEqual(pendingTarget);
    expect(createClient).toHaveBeenCalledWith({ appId: "app-1", privateKeyPem: "PEM", psu });
  });

  it("returns no preview context when the account is not pending", async () => {
    const { service, createClient } = setup({ loadPendingSyncTarget: vi.fn(async () => null) });
    expect(await service.previewContext({ userId: "user-1", bankAccountId: "ba1" })).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });
});
