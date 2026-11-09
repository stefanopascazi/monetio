import { describe, expect, it } from "vitest";
import { ALL_ACCOUNTS, visibleAccounts } from "./account-filter";

const accounts = [
  { id: "a", name: "Conto A" },
  { id: "b", name: "Conto B" },
];

describe("visibleAccounts", () => {
  it("returns every account for the all selection", () => {
    expect(visibleAccounts(accounts, ALL_ACCOUNTS)).toEqual(accounts);
  });

  it("returns only the selected account", () => {
    expect(visibleAccounts(accounts, "b")).toEqual([accounts[1]]);
  });

  it("falls back to all for unknown ids", () => {
    expect(visibleAccounts(accounts, "zzz")).toEqual(accounts);
  });
});
