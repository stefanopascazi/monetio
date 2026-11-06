import { describe, expect, it } from "vitest";
import { transferTargets } from "./transfer-targets";

describe("transferTargets", () => {
  it("skips archived accounts and numbers owners with several accounts", () => {
    const res = transferTargets([
      { id: "a", name: "Conto privato di Asha", archived: false },
      { id: "x", name: "Conto privato di Asha", archived: true },
      { id: "b", name: "Conto privato di Asha", archived: false },
      { id: "c", name: "Conto privato di Luca", archived: false },
    ]);
    expect(res).toEqual([
      { id: "a", name: "Conto privato di Asha (1)" },
      { id: "b", name: "Conto privato di Asha (2)" },
      { id: "c", name: "Conto privato di Luca" },
    ]);
  });
});
