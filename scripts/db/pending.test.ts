import { describe, expect, it } from "vitest";
import { pendingMigrations } from "./pending";

describe("pendingMigrations", () => {
  it("returns unapplied sql files in order", () => {
    expect(pendingMigrations(["0002_b.sql", "0001_a.sql", "README.md", "0003_c.sql"], ["0001_a.sql"])).toEqual([
      "0002_b.sql",
      "0003_c.sql",
    ]);
  });

  it("returns nothing when all are applied", () => {
    expect(pendingMigrations(["0001_a.sql"], new Set(["0001_a.sql"]))).toEqual([]);
  });
});
