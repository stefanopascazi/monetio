import type { Sql } from "postgres";
import { describe, expect, it } from "vitest";
import { createJobs } from "./registry.ts";

const sql = (() => {}) as unknown as Sql;
const base = { databaseUrl: "postgres://u:p@h/db", tickMs: 30_000, heartbeatUrls: {} };

describe("createJobs", () => {
  it("registers the backup only when configured", () => {
    expect(createJobs(sql, { ...base, backup: null }).map((j) => j.name)).toEqual(["db-ping"]);
    expect(createJobs(sql, { ...base, backup: { remote: "r2:b", ageRecipient: "age1x" } }).map((j) => j.name)).toEqual(["db-ping", "backup"]);
  });
});
