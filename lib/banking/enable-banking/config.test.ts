// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { readEnableBankingConfig } from "./config";

const PEM = "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----";

describe("readEnableBankingConfig", () => {
  it("returns null when app id or key are missing", () => {
    expect(readEnableBankingConfig({})).toBeNull();
    expect(readEnableBankingConfig({ ENABLE_BANKING_APP_ID: "a" })).toBeNull();
    expect(readEnableBankingConfig({ ENABLE_BANKING_PRIVATE_KEY: PEM })).toBeNull();
  });

  it("reads an inline PEM and unescapes \\n", () => {
    const escaped = PEM.replace(/\n/g, "\\n");
    expect(readEnableBankingConfig({ ENABLE_BANKING_APP_ID: " a ", ENABLE_BANKING_PRIVATE_KEY: escaped })).toEqual({ appId: "a", privateKeyPem: PEM });
  });

  it("reads the key file when only the path is set", () => {
    const readFile = vi.fn(() => PEM);
    expect(readEnableBankingConfig({ ENABLE_BANKING_APP_ID: "a", ENABLE_BANKING_KEY_PATH: "k.pem" }, readFile)).toEqual({ appId: "a", privateKeyPem: PEM });
    expect(readFile).toHaveBeenCalledWith("k.pem");
  });

  it("rejects content that is not a private key", () => {
    expect(() => readEnableBankingConfig({ ENABLE_BANKING_APP_ID: "a", ENABLE_BANKING_PRIVATE_KEY: "nope" })).toThrow();
  });
});
