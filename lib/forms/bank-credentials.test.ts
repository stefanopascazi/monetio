// @vitest-environment node
import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isRsaPrivateKeyPem, parseBankCredentialsForm } from "./bank-credentials";

const rsaPem = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const ecPem = generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();

function form(values: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

describe("isRsaPrivateKeyPem", () => {
  it("accepts RSA keys only", () => {
    expect(isRsaPrivateKeyPem(rsaPem)).toBe(true);
    expect(isRsaPrivateKeyPem(ecPem)).toBe(false);
    expect(isRsaPrivateKeyPem("-----BEGIN PRIVATE KEY-----\nnope\n-----END PRIVATE KEY-----")).toBe(false);
    expect(isRsaPrivateKeyPem("")).toBe(false);
  });
});

describe("parseBankCredentialsForm", () => {
  it("returns trimmed values and normalises CRLF", () => {
    const res = parseBankCredentialsForm(form({ appId: " 1a2b3c4d-0000-1111-2222-333344445555 ", privateKey: rsaPem.replace(/\n/g, "\r\n") }));
    expect(res).toEqual({ ok: true, value: { appId: "1a2b3c4d-0000-1111-2222-333344445555", privateKeyPem: rsaPem.trim() } });
  });

  it("reports both fields when invalid", () => {
    const res = parseBankCredentialsForm(form({ appId: "x", privateKey: "abc" }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(Object.keys(res.errors).sort()).toEqual(["appId", "privateKey"]);
  });
});
