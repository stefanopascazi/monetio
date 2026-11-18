// @vitest-environment node
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { masterKeyFromEnv, openSecret, parseMasterKey, sealSecret } from "./secrets";

const key = randomBytes(32);
const PEM = "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----";

describe("sealSecret / openSecret", () => {
  it("round-trips and never contains the plain text", () => {
    const sealed = sealSecret(PEM, key, "user-1");
    expect(sealed).toMatch(/^v1\.[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(sealed).not.toContain("PRIVATE KEY");
    expect(openSecret(sealed, key, "user-1")).toBe(PEM);
  });

  it("uses a fresh IV each time", () => {
    expect(sealSecret(PEM, key, "u")).not.toBe(sealSecret(PEM, key, "u"));
  });

  it("fails with another context, another key or a tampered value", () => {
    const sealed = sealSecret(PEM, key, "user-1");
    expect(() => openSecret(sealed, key, "user-2")).toThrow();
    expect(() => openSecret(sealed, randomBytes(32), "user-1")).toThrow();
    const parts = sealed.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => openSecret(parts.join("."), key, "user-1")).toThrow();
    expect(() => openSecret("v2.a.b.c", key, "user-1")).toThrow();
  });
});

describe("parseMasterKey", () => {
  it("accepts exactly 32 bytes in base64", () => {
    expect(parseMasterKey(key.toString("base64")).equals(key)).toBe(true);
    expect(masterKeyFromEnv({ BANK_KEYS_SECRET: key.toString("base64") }).equals(key)).toBe(true);
  });

  it("rejects missing or short keys", () => {
    expect(() => parseMasterKey(undefined)).toThrow();
    expect(() => parseMasterKey(randomBytes(16).toString("base64"))).toThrow();
  });
});
