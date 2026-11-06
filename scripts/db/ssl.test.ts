import { describe, expect, it } from "vitest";
import { cleanUrl, sslFor } from "./ssl";

describe("sslFor", () => {
  it("requires TLS by default", () => {
    expect(sslFor("postgres://u:p@db.supabase.co:5432/postgres")).toBe("require");
    expect(sslFor("postgres://u:p@host/db?sslmode=require")).toBe("require");
  });

  it("disables TLS when sslmode=disable", () => {
    expect(sslFor("postgres://u:p@db:5432/postgres?sslmode=disable")).toBe(false);
    expect(sslFor("postgres://u:p@db/postgres?x=1&sslmode=disable")).toBe(false);
  });
});

describe("cleanUrl", () => {
  it("drops unsupported params", () => {
    expect(cleanUrl("postgres://h/db?sslmode=disable")).toBe("postgres://h/db");
    expect(cleanUrl("postgres://h/db?sslmode=require&supa=base-pooler.x")).toBe("postgres://h/db");
  });
});
