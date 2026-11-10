import { describe, expect, it } from "vitest";
import { pgEnvFromUrl } from "./pg-env.ts";

describe("pgEnvFromUrl", () => {
  it("maps a Supabase URL to libpq variables with TLS", () => {
    expect(pgEnvFromUrl("postgres://postgres.abc:p%40ss@db.example.com:6543/postgres?sslmode=require")).toEqual({
      PGHOST: "db.example.com",
      PGPORT: "6543",
      PGUSER: "postgres.abc",
      PGPASSWORD: "p@ss",
      PGDATABASE: "postgres",
      PGSSLMODE: "require",
    });
  });

  it("defaults port and database, honours sslmode=disable", () => {
    expect(pgEnvFromUrl("postgresql://u:p@localhost?sslmode=disable")).toMatchObject({
      PGPORT: "5432",
      PGDATABASE: "postgres",
      PGSSLMODE: "disable",
    });
  });
});
