import { describe, expect, it } from "vitest";
import { accountHref, adjacentAccounts, landingAccountId, switcherAccounts } from "./account-nav";

const a = { id: "a", archived: false };
const b = { id: "b", archived: false };
const c = { id: "c", archived: false };
const z = { id: "z", archived: true };

describe("switcherAccounts", () => {
  it("lists active accounts only", () => {
    expect(switcherAccounts([a, z, b], "a")).toEqual([a, b]);
  });
  it("appends the current account when archived", () => {
    expect(switcherAccounts([a, z, b], "z")).toEqual([a, b, z]);
  });
});

describe("adjacentAccounts", () => {
  it("returns neighbours", () => {
    expect(adjacentAccounts([a, b, c], "b")).toEqual({ prev: a, next: c });
  });
  it("does not wrap at the edges", () => {
    expect(adjacentAccounts([a, b, c], "a")).toEqual({ prev: null, next: b });
    expect(adjacentAccounts([a, b, c], "c")).toEqual({ prev: b, next: null });
  });
  it("returns nothing for an unknown id", () => {
    expect(adjacentAccounts([a, b], "x")).toEqual({ prev: null, next: null });
  });
});

describe("accountHref", () => {
  it("keeps period params and drops the rest", () => {
    expect(accountHref("b", { mese: "2026-10", n: "60", proiezione: "2026-12" })).toBe("/conti/b?mese=2026-10&proiezione=2026-12");
  });
  it("uses the first value of repeated params", () => {
    expect(accountHref("b", { da: ["2026-01-01", "2026-02-01"], a: "2026-03-01" })).toBe("/conti/b?da=2026-01-01&a=2026-03-01");
  });
  it("returns the bare path without params", () => {
    expect(accountHref("b")).toBe("/conti/b");
  });
});

describe("landingAccountId", () => {
  it("prefers the last visited active account", () => {
    expect(landingAccountId([a, b], "b")).toBe("b");
  });
  it("falls back to the first active when last is archived or unknown", () => {
    expect(landingAccountId([z, a, b], "z")).toBe("a");
    expect(landingAccountId([a, b], "x")).toBe("a");
    expect(landingAccountId([a, b], undefined)).toBe("a");
  });
  it("returns null without active accounts", () => {
    expect(landingAccountId([z], "z")).toBeNull();
  });
});
