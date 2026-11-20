// @vitest-environment node
import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createEnableBankingClient, EnableBankingError, psuHeaders } from "./client";

const privateKeyPem = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("createEnableBankingClient", () => {
  it("lists banks for a country with a signed bearer token", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ aspsps: [{ name: "Mock ASPSP", country: "IT" }] }));
    const client = createEnableBankingClient({ appId: "app-1", privateKeyPem, baseUrl: "https://api.test", fetch: fetchMock });

    await expect(client.listAspsps("it")).resolves.toEqual([{ name: "Mock ASPSP", country: "IT" }]);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.test/aspsps?country=IT");
    expect((init.headers as Record<string, string>).Authorization).toMatch(/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
  });

  it("returns an empty list when the API omits aspsps", async () => {
    const client = createEnableBankingClient({ appId: "app-1", privateKeyPem, fetch: vi.fn(async () => jsonResponse({})) });
    await expect(client.listAspsps("IT")).resolves.toEqual([]);
  });

  it("posts the auth request as JSON and exchanges the code for a session", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ url: "https://bank.example/consent" }))
      .mockResolvedValueOnce(jsonResponse({ session_id: "s-1", accounts: [], aspsp: { name: "Mock ASPSP", country: "FI" } }));
    const client = createEnableBankingClient({ appId: "app-1", privateKeyPem, baseUrl: "https://api.test", fetch: fetchMock });
    const request = {
      access: { valid_until: "2027-05-17T00:00:00Z" },
      aspsp: { name: "Mock ASPSP", country: "FI" },
      state: "st",
      redirect_url: "http://localhost:3000/api/bank/callback",
      psu_type: "personal" as const,
    };

    await expect(client.startAuth(request)).resolves.toEqual({ url: "https://bank.example/consent" });
    await expect(client.createSession("code-1")).resolves.toMatchObject({ session_id: "s-1" });

    const [authUrl, authInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(authUrl).toBe("https://api.test/auth");
    expect(authInit.method).toBe("POST");
    expect(JSON.parse(String(authInit.body))).toEqual(request);
    expect((authInit.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(JSON.parse(String((fetchMock.mock.calls[1] as [string, RequestInit])[1].body))).toEqual({ code: "code-1" });
  });

  it("deletes a session and accepts an empty body", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    const client = createEnableBankingClient({ appId: "app-1", privateKeyPem, baseUrl: "https://api.test", fetch: fetchMock });
    await expect(client.deleteSession("s/1")).resolves.toEqual({});
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.test/sessions/s%2F1");
    expect(init.method).toBe("DELETE");
  });

  it("follows continuation keys for booked transactions", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ transactions: [{ entry_reference: "a" }], continuation_key: "k2" }))
      .mockResolvedValueOnce(jsonResponse({ transactions: [{ entry_reference: "b" }] }));
    const client = createEnableBankingClient({ appId: "app-1", privateKeyPem, baseUrl: "https://api.test", fetch: fetchMock });
    const txns = await client.getTransactions("u 1", "2026-11-01");
    expect(txns.map((t) => t.entry_reference)).toEqual(["a", "b"]);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.test/accounts/u%201/transactions?date_from=2026-11-01&transaction_status=BOOK");
    expect(fetchMock.mock.calls[1][0]).toContain("continuation_key=k2");
  });

  it("stops after the page limit", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ transactions: [{}], continuation_key: "again" }));
    const client = createEnableBankingClient({ appId: "app-1", privateKeyPem, fetch: fetchMock });
    expect(await client.getTransactions("u", "2026-11-01", 3)).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("reads balances", async () => {
    const balance = { balance_amount: { currency: "EUR", amount: "10.00" }, balance_type: "CLBD" };
    const client = createEnableBankingClient({ appId: "app-1", privateKeyPem, fetch: vi.fn(async () => jsonResponse({ balances: [balance] })) });
    await expect(client.getBalances("u")).resolves.toEqual([balance]);
  });

  it("throws EnableBankingError with status and body on failure", async () => {
    const client = createEnableBankingClient({ appId: "app-1", privateKeyPem, fetch: vi.fn(async () => new Response("bad kid", { status: 401 })) });
    const error = await client.getApplication().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EnableBankingError);
    expect(error).toMatchObject({ status: 401, body: "bad kid" });
  });
});

describe("psuHeaders", () => {
  it("marks reads as user-initiated when the person is present", () => {
    expect(psuHeaders({ ipAddress: "203.0.113.5", userAgent: "Firefox" })).toEqual({ "Psu-Ip-Address": "203.0.113.5", "Psu-User-Agent": "Firefox" });
    expect(psuHeaders({ ipAddress: "203.0.113.5", userAgent: null })).toEqual({ "Psu-Ip-Address": "203.0.113.5" });
    expect(psuHeaders(undefined)).toEqual({});
  });

  it("sends them on every call", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ balances: [] }));
    const client = createEnableBankingClient({ appId: "app-1", privateKeyPem, fetch: fetchMock, psu: { ipAddress: "203.0.113.5", userAgent: "UA" } });
    await client.getBalances("acc");
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Psu-Ip-Address"]).toBe("203.0.113.5");
  });
});
