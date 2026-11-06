import { describe, expect, it } from "vitest";
import { transferTargets } from "./transfer-targets";

describe("transferTargets", () => {
  it("names each account after its owner and skips archived ones", () => {
    const res = transferTargets([
      { id: "a", name: "Conto privato di Asha", archived: false, accountName: "Fineco" },
      { id: "x", name: "Conto privato di Asha", archived: true, accountName: "Vecchio" },
      { id: "b", name: "Conto privato di Asha", archived: false, accountName: " Carta " },
      { id: "c", name: "Conto privato di Luca", archived: false },
    ]);
    expect(res).toEqual([
      { id: "a", name: "Conto privato di Asha · Fineco" },
      { id: "b", name: "Conto privato di Asha · Carta" },
      { id: "c", name: "Conto privato di Luca" },
    ]);
  });

  it("numbers labels that are still equal", () => {
    const res = transferTargets([
      { id: "a", name: "Conto privato di Asha", archived: false, accountName: "Fineco" },
      { id: "b", name: "Conto privato di Asha", archived: false, accountName: "Fineco" },
    ]);
    expect(res.map((r) => r.name)).toEqual(["Conto privato di Asha · Fineco (1)", "Conto privato di Asha · Fineco (2)"]);
  });
});
