import { describe, expect, it } from "vitest";
import { bankCallbackUrl, mapBankApp, requestOrigin, shortAppId } from "./bank-app";

describe("mapBankApp", () => {
  it("maps the RPC row", () => {
    expect(mapBankApp({ environment: "production", app_id: "abc", app_name: "MonetIO", verified_at: "2026-11-18T10:00:00Z" })).toEqual({
      environment: "production",
      appId: "abc",
      appName: "MonetIO",
      verifiedAt: "2026-11-18T10:00:00Z",
    });
  });

  it("treats unknown environments as sandbox", () => {
    expect(mapBankApp({ environment: "x", app_id: "a", app_name: null, verified_at: "" }).environment).toBe("sandbox");
  });
});

describe("shortAppId", () => {
  it("keeps head and tail of long ids", () => {
    expect(shortAppId("1a2b3c4d-0000-1111-2222-333344445555")).toBe("1a2b…5555");
    expect(shortAppId("short-id")).toBe("short-id");
  });
});

describe("requestOrigin", () => {
  const from = (h: Record<string, string>) => (name: string) => h[name] ?? null;
  it("prefers forwarded headers and defaults to https for public hosts", () => {
    expect(requestOrigin(from({ "x-forwarded-host": "app.example", "x-forwarded-proto": "https,http", host: "internal" }))).toBe("https://app.example");
    expect(requestOrigin(from({ host: "app.example" }))).toBe("https://app.example");
  });

  it("uses http on localhost", () => {
    expect(requestOrigin(from({ host: "localhost:3000" }))).toBe("http://localhost:3000");
    expect(requestOrigin(from({}))).toBe("http://localhost:3000");
  });
});

describe("bankCallbackUrl", () => {
  it("appends the callback path without double slashes", () => {
    expect(bankCallbackUrl("https://app.example/")).toBe("https://app.example/api/bank/callback");
    expect(bankCallbackUrl("http://localhost:3000")).toBe("http://localhost:3000/api/bank/callback");
  });
});
