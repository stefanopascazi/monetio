import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieGet = vi.fn();
const cookieDelete = vi.fn();
const completeLink = vi.fn();

vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: cookieGet, delete: cookieDelete })) }));
vi.mock("@/lib/data/context", () => ({ getContext: vi.fn(async () => ({ userId: "user-1", householdId: "h1" })) }));
vi.mock("@/lib/banking/server", () => ({ BANK_STATE_COOKIE: "mio_bank_state", bankService: () => ({ completeLink }) }));

const { GET } = await import("./route");

const call = (query: string) => GET(new Request(`http://localhost:3000/api/bank/callback?${query}`));
const location = (res: Response) => res.headers.get("location");

beforeEach(() => {
  vi.clearAllMocks();
  cookieGet.mockReturnValue({ value: "st" });
});

describe("GET /api/bank/callback", () => {
  it("stores the session and returns to the banks page", async () => {
    completeLink.mockResolvedValue(2);
    const res = await call("code=c1&state=st");
    expect(completeLink).toHaveBeenCalledWith({ userId: "user-1", householdId: "h1", code: "c1" });
    expect(location(res)).toBe("http://localhost:3000/dati/banche?esito=collegata");
    expect(cookieDelete).toHaveBeenCalledWith({ name: "mio_bank_state", path: "/api/bank" });
  });

  it("warns when the bank shared no account", async () => {
    completeLink.mockResolvedValue(0);
    const res = await call("code=c1&state=st");
    expect(location(res)).toBe("http://localhost:3000/dati/banche?esito=nessun-conto");
  });

  it("refuses a state that does not match the cookie", async () => {
    expect(location(await call("code=c1&state=other"))).toMatch(/esito=scaduta$/);
    cookieGet.mockReturnValue(undefined);
    expect(location(await call("code=c1&state=st"))).toMatch(/esito=scaduta$/);
    expect(completeLink).not.toHaveBeenCalled();
  });

  it("reports a consent denied at the bank", async () => {
    expect(location(await call("state=st&error=access_denied"))).toMatch(/esito=negata$/);
  });

  it("reports provider or storage errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    completeLink.mockRejectedValue(new Error("boom"));
    expect(location(await call("code=c1&state=st"))).toMatch(/esito=errore$/);
  });
});
