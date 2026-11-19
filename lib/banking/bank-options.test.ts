import { describe, expect, it } from "vitest";
import { recentBanks, recentFirst } from "./bank-options";

const banks = [
  { name: "Intesa Sanpaolo" },
  { name: "Crédit Agricole Italia" },
  { name: "BCC Ostra e Morro d'Alba" },
  { name: "Revolut" },
];

describe("recentBanks", () => {
  it("keeps linked banks still offered, once", () => {
    expect(
      recentBanks(banks, ["Revolut", "Old Bank", "Revolut", "Intesa Sanpaolo"]),
    ).toEqual(["Revolut", "Intesa Sanpaolo"]);
  });
});

describe("recentFirst", () => {
  it("puts recent banks on top in their order", () => {
    expect(
      recentFirst(banks, ["Revolut", "Intesa Sanpaolo"]).map((b) => b.name),
    ).toEqual([
      "Revolut",
      "Intesa Sanpaolo",
      "Crédit Agricole Italia",
      "BCC Ostra e Morro d'Alba",
    ]);
  });
});
