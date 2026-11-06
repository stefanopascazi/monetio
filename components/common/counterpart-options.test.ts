import { describe, expect, it } from "vitest";
import { counterpartOptions } from "./counterpart-options";

describe("counterpartOptions", () => {
  const accounts = [{ id: "a", name: "Conto comune" }];

  it("lists visible accounts first, then hidden household accounts", () => {
    expect(counterpartOptions(accounts, [{ id: "h", name: "Conto privato di Asha" }, { id: "a", name: "dup" }])).toEqual([
      { value: "a", label: "Conto comune" },
      { value: "h", label: "Conto privato di Asha" },
    ]);
  });

  it("keeps the current destination when it is no longer offered", () => {
    expect(counterpartOptions(accounts, [], { id: "x", name: "Conto privato" }).map((o) => o.value)).toEqual(["a", "x"]);
    expect(counterpartOptions(accounts, [], { id: "a", name: "Conto comune" })).toHaveLength(1);
    expect(counterpartOptions(accounts)).toHaveLength(1);
  });
});
