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

  it("throws EnableBankingError with status and body on failure", async () => {
    const client = createEnableBankingClient({ appId: "app-1", privateKeyPem, fetch: vi.fn(async () => new Response("bad kid", { status: 401 })) });
    const error = await client.getApplication().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EnableBankingError);
    expect(error).toMatchObject({ status: 401, body: "bad kid" });
  });
});
