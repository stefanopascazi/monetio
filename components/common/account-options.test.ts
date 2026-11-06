import { describe, expect, it } from "vitest";
import { accountOptions } from "./account-options";

describe("accountOptions", () => {
  const accounts = [{ id: "a", name: "Conto comune" }];

  it("lists visible accounts first, then hidden household accounts", () => {
    expect(accountOptions(accounts, [{ id: "h", name: "Conto privato di Asha" }, { id: "a", name: "dup" }])).toEqual([
      { value: "a", label: "Conto comune" },
      { value: "h", label: "Conto privato di Asha" },
    ]);
  });

  it("keeps the current destination when it is no longer offered", () => {
    expect(accountOptions(accounts, [], { id: "x", name: "Conto privato" }).map((o) => o.value)).toEqual(["a", "x"]);
    expect(accountOptions(accounts, [], { id: "a", name: "Conto comune" })).toHaveLength(1);
    expect(accountOptions(accounts)).toHaveLength(1);
  });
});
