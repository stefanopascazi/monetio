import { describe, expect, it } from "vitest";
import { parseMigrationRows, planMigrations } from "./migrations.ts";

const COPY = [
  "SET client_encoding = 'UTF8';",
  "COPY public._migrations (name, applied_at) FROM stdin;",
  "0002_views.sql\t2026-11-06 15:43:45.180618+00",
  "0001_init.sql\t2026-11-06 15:43:45.03871+00",
  "\\.",
  "",
].join("\n");

describe("parseMigrationRows", () => {
  it("reads names from the COPY block", () => {
    expect(parseMigrationRows(COPY)).toEqual(["0002_views.sql", "0001_init.sql"]);
  });

  it("returns nothing without the table", () => {
    expect(parseMigrationRows("SET x = 1;\n")).toEqual([]);
  });
});

describe("planMigrations", () => {
  const repo = ["0001_init.sql", "0002_views.sql", "0003_more.sql", "README.md"];

  it("rebuilds the backup schema in order, then applies newer migrations", () => {
    expect(planMigrations(repo, ["0002_views.sql", "0001_init.sql"])).toEqual({
      before: ["0001_init.sql", "0002_views.sql"],
      after: ["0003_more.sql"],
    });
  });

  it("fails when the repository lacks a migration of the backup", () => {
    expect(() => planMigrations(repo, ["0001_init.sql", "0004_future.sql"])).toThrow(/0004_future\.sql/);
  });

  it("fails on a backup with no migrations", () => {
    expect(() => planMigrations(repo, [])).toThrow(/non contiene migration/);
  });
});
