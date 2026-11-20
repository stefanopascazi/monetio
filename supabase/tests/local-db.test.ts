import { describe, expect, it } from "vitest";
import { localTestDbUrl } from "./local-db.ts";

const local = "postgres://postgres:pw@localhost:54322/postgres?sslmode=disable";
const remote = "postgres://postgres.abc:pw@aws-0-eu-central-1.pooler.supabase.com:5432/postgres";

describe("localTestDbUrl", () => {
  it("returns a local URL when enabled", () => {
    expect(localTestDbUrl({ MONETIO_DB_TESTS: "1", POSTGRES_URL_NON_POOLING: local })).toBe(local);
    expect(localTestDbUrl({ MONETIO_DB_TESTS: "1", POSTGRES_URL: local.replace("localhost", "127.0.0.1") })).not.toBeNull();
  });

  it("is off unless explicitly enabled", () => {
    expect(localTestDbUrl({ POSTGRES_URL_NON_POOLING: local })).toBeNull();
  });

  it("never returns a remote database, even when enabled", () => {
    expect(localTestDbUrl({ MONETIO_DB_TESTS: "1", POSTGRES_URL_NON_POOLING: remote })).toBeNull();
    expect(localTestDbUrl({ MONETIO_DB_TESTS: "1", POSTGRES_URL: remote })).toBeNull();
  });

  it("ignores missing or malformed URLs", () => {
    expect(localTestDbUrl({ MONETIO_DB_TESTS: "1" })).toBeNull();
    expect(localTestDbUrl({ MONETIO_DB_TESTS: "1", POSTGRES_URL: "not a url" })).toBeNull();
  });
});
