import { describe, expect, it } from "vitest";
import { heartbeatEnvName, parseConfig } from "./config.ts";

describe("heartbeatEnvName", () => {
  it("maps job names to env variable names", () => {
    expect(heartbeatEnvName("db-ping")).toBe("HEALTHCHECK_URL_DB_PING");
    expect(heartbeatEnvName("backup.daily")).toBe("HEALTHCHECK_URL_BACKUP_DAILY");
  });
});

describe("parseConfig", () => {
  it("prefers the non-pooled URL and applies defaults", () => {
    const config = parseConfig({ POSTGRES_URL: "pooled", POSTGRES_URL_NON_POOLING: "direct" });
    expect(config).toEqual({ databaseUrl: "direct", tickMs: 30_000, heartbeatUrls: {}, backup: null, sentryDsn: null });
  });

  it("falls back to the pooled URL", () => {
    expect(parseConfig({ POSTGRES_URL: "pooled" }).databaseUrl).toBe("pooled");
  });

  it("reads the optional Sentry DSN", () => {
    expect(parseConfig({ POSTGRES_URL: "x", SENTRY_DSN: "https://k@o.ingest.sentry.io/1" }).sentryDsn).toBe("https://k@o.ingest.sentry.io/1");
  });

  it("requires a database URL", () => {
    expect(() => parseConfig({})).toThrow(/POSTGRES_URL_NON_POOLING/);
  });

  it("rejects invalid tick intervals", () => {
    expect(() => parseConfig({ POSTGRES_URL: "x", WORKER_TICK_MS: "abc" })).toThrow(/WORKER_TICK_MS/);
    expect(() => parseConfig({ POSTGRES_URL: "x", WORKER_TICK_MS: "10" })).toThrow(/WORKER_TICK_MS/);
  });

  it("parses the backup target", () => {
    expect(parseConfig({ POSTGRES_URL: "x", BACKUP_REMOTE: "r2:bucket/", BACKUP_AGE_RECIPIENT: "age1abc" }).backup).toEqual({
      remote: "r2:bucket",
      ageRecipient: "age1abc",
    });
  });

  it("rejects a partial or invalid backup target", () => {
    expect(() => parseConfig({ POSTGRES_URL: "x", BACKUP_REMOTE: "r2:bucket" })).toThrow(/together/);
    expect(() => parseConfig({ POSTGRES_URL: "x", BACKUP_REMOTE: "r2:b", BACKUP_AGE_RECIPIENT: "AGE-SECRET-KEY-1" })).toThrow(/public key/);
  });

  it("collects non-empty heartbeat URLs", () => {
    const config = parseConfig({ POSTGRES_URL: "x", HEALTHCHECK_URL_DB_PING: "https://hc/1", HEALTHCHECK_URL_EMPTY: "", OTHER: "y" });
    expect(config.heartbeatUrls).toEqual({ HEALTHCHECK_URL_DB_PING: "https://hc/1" });
  });
});
