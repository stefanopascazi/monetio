import { beforeEach, describe, expect, it, vi } from "vitest";

const upsert = vi.fn();
const rpc = vi.fn();
const prepareBankCredentials = vi.fn();

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/data/context", () => ({ getContext: vi.fn(async () => ({ userId: "user-1" })) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({ from: () => ({ upsert }) })) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ rpc })) }));
vi.mock("@/lib/banking/credentials", () => ({ prepareBankCredentials }));
vi.mock("@/lib/forms/bank-credentials", () => ({
  parseBankCredentialsForm: (fd: FormData) =>
    fd.get("appId") ? { ok: true, value: { appId: String(fd.get("appId")), privateKeyPem: "PEM" } } : { ok: false, errors: { appId: "x" } },
}));

const { deleteBankCredentials, saveBankCredentials } = await import("./banking");

const row = { user_id: "user-1", environment: "sandbox", app_id: "app-12345678", app_name: "dev", private_key_sealed: "v1.a.b.c", verified_at: "2026-11-18T10:00:00.000Z" };
const form = (appId = "app-12345678") => {
  const fd = new FormData();
  if (appId) fd.set("appId", appId);
  return fd;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("BANK_KEYS_SECRET", Buffer.alloc(32, 1).toString("base64"));
});

describe("saveBankCredentials", () => {
  it("stores the verified, sealed row for the caller", async () => {
    prepareBankCredentials.mockResolvedValue({ ok: true, row });
    upsert.mockResolvedValue({ error: null });
    const res = await saveBankCredentials({}, form());
    expect(res.ok).toBe(true);
    expect(prepareBankCredentials).toHaveBeenCalledWith({ userId: "user-1", appId: "app-12345678", privateKeyPem: "PEM" }, { masterKey: expect.any(Buffer) });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ ...row, updated_at: expect.any(String) }), { onConflict: "user_id" });
  });

  it("stops on invalid fields without calling Enable Banking", async () => {
    const res = await saveBankCredentials({}, form(""));
    expect(res.ok).toBe(false);
    expect(prepareBankCredentials).not.toHaveBeenCalled();
  });

  it("refuses when the master key is not configured", async () => {
    vi.stubEnv("BANK_KEYS_SECRET", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await saveBankCredentials({}, form());
    expect(res.message).toMatch(/non è ancora configurato/);
    expect(prepareBankCredentials).not.toHaveBeenCalled();
  });

  it("passes the verification message through and writes nothing", async () => {
    prepareBankCredentials.mockResolvedValue({ ok: false, message: "non riconosce" });
    const res = await saveBankCredentials({}, form());
    expect(res).toMatchObject({ ok: false, message: "non riconosce" });
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe("deleteBankCredentials", () => {
  it("deletes through the RPC", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    expect((await deleteBankCredentials()).ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith("delete_my_bank_credentials");
  });

  it("reports when there was nothing to delete", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    expect((await deleteBankCredentials()).ok).toBe(false);
  });
});
