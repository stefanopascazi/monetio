// @vitest-environment node
import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createAppJwt, MAX_JWT_TTL_SECONDS } from "./jwt";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

function decode(part: string) {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

describe("createAppJwt", () => {
  it("builds an RS256 token with the app id as kid and the Enable Banking claims", () => {
    const token = createAppJwt({ appId: "app-123", privateKeyPem, nowSeconds: 1_000, ttlSeconds: 600 });
    const [header, payload] = token.split(".");
    expect(decode(header)).toEqual({ typ: "JWT", alg: "RS256", kid: "app-123" });
    expect(decode(payload)).toEqual({ iss: "enablebanking.com", aud: "api.enablebanking.com", iat: 1_000, exp: 1_600 });
  });

  it("signs with the private key so the public key verifies it", () => {
    const token = createAppJwt({ appId: "app-123", privateKeyPem, nowSeconds: 1_000 });
    const [header, payload, signature] = token.split(".");
    const ok = createVerify("RSA-SHA256").update(`${header}.${payload}`).verify(publicKey, Buffer.from(signature, "base64url"));
    expect(ok).toBe(true);
  });

  it("rejects a missing app id and a lifetime over 24 hours", () => {
    expect(() => createAppJwt({ appId: " ", privateKeyPem })).toThrow();
    expect(() => createAppJwt({ appId: "a", privateKeyPem, ttlSeconds: MAX_JWT_TTL_SECONDS + 1 })).toThrow();
    expect(() => createAppJwt({ appId: "a", privateKeyPem, ttlSeconds: 0 })).toThrow();
  });
});
