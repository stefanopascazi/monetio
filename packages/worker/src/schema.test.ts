import { describe, expect, it, vi } from "vitest";
import { createSchemaGate, isSchemaNotReady, latestMigration, migrationApplied, REQUIRED_MIGRATION } from "./schema.ts";

describe("isSchemaNotReady", () => {
  it("matches missing tables and columns only", () => {
    expect(isSchemaNotReady({ code: "42P01" })).toBe(true);
    expect(isSchemaNotReady({ code: "42703" })).toBe(true);
    expect(isSchemaNotReady({ code: "40P01" })).toBe(false);
    expect(isSchemaNotReady(null)).toBe(false);
  });
});

describe("latestMigration", () => {
  it("picks the newest SQL file in apply order", () => {
    expect(latestMigration(["0023_push.sql", "README.md", "0024_center.sql", "0002_x.sql"])).toBe("0024_center.sql");
    expect(latestMigration([])).toBeUndefined();
  });
});

describe("createSchemaGate", () => {
  it("is open without a required migration (tests, local runs)", async () => {
    expect(REQUIRED_MIGRATION).toBeUndefined();
    const isApplied = vi.fn();
    expect(await createSchemaGate(undefined, isApplied, vi.fn())()).toBe(true);
    expect(isApplied).not.toHaveBeenCalled();
  });

  it("waits for the migration, logging once, then stays open", async () => {
    const log = vi.fn();
    const isApplied = vi.fn<(name: string) => Promise<boolean>>().mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const ready = createSchemaGate("0024_center.sql", isApplied, log);
    expect([await ready(), await ready(), await ready(), await ready()]).toEqual([false, false, true, true]);
    expect(isApplied).toHaveBeenCalledTimes(3);
    expect(log.mock.calls.map((c) => c[1])).toEqual(["waiting for migration, jobs paused", "schema ready"]);
  });

  it("does not block the jobs when the check itself fails", async () => {
    const log = vi.fn();
    const ready = createSchemaGate("0024_center.sql", async () => Promise.reject(new Error("permission denied")), log);
    expect(await ready()).toBe(true);
    expect(log).toHaveBeenCalledWith("warn", "schema check failed, running jobs anyway", expect.objectContaining({ migration: "0024_center.sql" }));
  });
});

describe("migrationApplied", () => {
  it("looks the name up in the migrations table", async () => {
    const sql = vi.fn(async () => [{ "?column?": 1 }]);
    expect(await migrationApplied(sql as never)("0024_center.sql")).toBe(true);
    expect(sql.mock.calls[0]).toContain("0024_center.sql");
  });
});
