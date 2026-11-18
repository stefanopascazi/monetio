import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieSet = vi.fn();
const startLink = vi.fn();
const removeLink = vi.fn();
const bankService = vi.fn(() => ({ startLink, removeLink }));

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ host: "localhost:3000" })),
  cookies: vi.fn(async () => ({ set: cookieSet })),
}));
vi.mock("@/lib/data/context", () => ({ getContext: vi.fn(async () => ({ userId: "user-1" })) }));
vi.mock("@/lib/banking/server", () => ({ BANK_STATE_COOKIE: "mio_bank_state", bankService }));

const { BankSetupMissing } = await import("@/lib/banking/bank-service");
const { removeBankConnection, startBankLink } = await import("./bank-links");

beforeEach(() => vi.clearAllMocks());

describe("startBankLink", () => {
  it("returns the bank URL and keeps the state in an http-only cookie scoped to the callback", async () => {
    startLink.mockResolvedValue({ ok: true, url: "https://bank.example", state: "st" });
    expect(await startBankLink("Mock ASPSP")).toEqual({ ok: true, url: "https://bank.example" });
    expect(startLink).toHaveBeenCalledWith({ userId: "user-1", aspspName: "Mock ASPSP", country: "IT", redirectUrl: "http://localhost:3000/api/bank/callback" });
    expect(cookieSet).toHaveBeenCalledWith("mio_bank_state", "st", expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/api/bank", maxAge: 600 }));
  });

  it("validates the input before calling the service", async () => {
    expect((await startBankLink("")).ok).toBe(false);
    expect((await startBankLink("Mock", "italia")).ok).toBe(false);
    expect(startLink).not.toHaveBeenCalled();
  });

  it("explains a missing app and a failing provider", async () => {
    startLink.mockRejectedValueOnce(new BankSetupMissing());
    expect((await startBankLink("Mock")).message).toMatch(/carica la tua app/);
    vi.spyOn(console, "error").mockImplementation(() => {});
    startLink.mockRejectedValueOnce(new Error("boom"));
    expect((await startBankLink("Mock")).message).toMatch(/non ha avviato/);
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("reports a server without master key", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    bankService.mockImplementationOnce(() => {
      throw new Error("no key");
    });
    expect((await startBankLink("Mock")).message).toMatch(/non è ancora configurato/);
  });
});

describe("removeBankConnection", () => {
  const id = "11111111-2222-3333-4444-555555555555";

  it("removes the caller's connection", async () => {
    removeLink.mockResolvedValue(true);
    expect((await removeBankConnection(id)).ok).toBe(true);
    expect(removeLink).toHaveBeenCalledWith({ userId: "user-1", connectionId: id });
  });

  it("rejects bad ids and unknown connections", async () => {
    expect((await removeBankConnection("x")).ok).toBe(false);
    removeLink.mockResolvedValue(false);
    expect((await removeBankConnection(id)).message).toMatch(/non trovato/);
  });
});
