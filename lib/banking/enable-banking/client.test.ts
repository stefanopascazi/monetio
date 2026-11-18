// @vitest-environment node
import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createEnableBankingClient, EnableBankingError } from "./client";

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

  it("throws EnableBankingError with status and body on failure", async () => {
    const client = createEnableBankingClient({ appId: "app-1", privateKeyPem, fetch: vi.fn(async () => new Response("bad kid", { status: 401 })) });
    const error = await client.getApplication().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EnableBankingError);
    expect(error).toMatchObject({ status: 401, body: "bad kid" });
  });
});
