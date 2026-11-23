import { describe, expect, it } from "vitest";
import { confirmationMatches, describeTarget, fileFormat, parseRestoreArgs } from "./args.ts";

describe("parseRestoreArgs", () => {
  it("reads a remote restore", () => {
    expect(parseRestoreArgs({ backup: " latest ", reset: true, "max-age-hours": "48" })).toEqual({
      mode: "remote",
      source: "latest",
      identity: undefined,
      reset: true,
      yes: false,
      maxAgeHours: 48,
    });
  });

  it("reads list and file modes", () => {
    expect(parseRestoreArgs({ list: true }).mode).toBe("list");
    expect(parseRestoreArgs({ file: "/restore/x.dump", identity: "k.txt", yes: true })).toMatchObject({ mode: "file", source: "/restore/x.dump", identity: "k.txt", yes: true });
  });

  it("requires exactly one source", () => {
    expect(() => parseRestoreArgs({})).toThrow(/una sola/);
    expect(() => parseRestoreArgs({ list: true, backup: "latest" })).toThrow(/una sola/);
    expect(() => parseRestoreArgs({ backup: " " })).toThrow(/mancante/);
  });

  it("validates --max-age-hours", () => {
    expect(() => parseRestoreArgs({ backup: "latest", "max-age-hours": "0" })).toThrow(/intero positivo/);
    expect(() => parseRestoreArgs({ file: "x.dump", "max-age-hours": "5" })).toThrow(/solo con --backup/);
  });
});

describe("describeTarget", () => {
  it("shows host and database without credentials", () => {
    expect(describeTarget("postgres://postgres:secret@db.abc.supabase.co:5432/postgres?sslmode=require")).toEqual({ host: "db.abc.supabase.co", database: "postgres" });
  });
});

describe("confirmationMatches", () => {
  it("accepts the exact host, ignoring surrounding spaces", () => {
    expect(confirmationMatches(" db.abc.supabase.co\n", "db.abc.supabase.co")).toBe(true);
    expect(confirmationMatches("db", "db.abc.supabase.co")).toBe(false);
  });
});

describe("fileFormat", () => {
  it("maps extensions to decoding steps", () => {
    expect(fileFormat("a.dump.zst.age")).toBe("age");
    expect(fileFormat("a.dump.zst")).toBe("zstd");
    expect(fileFormat("a.dump")).toBe("dump");
    expect(() => fileFormat("a.sql")).toThrow(/Estensione/);
  });
});
