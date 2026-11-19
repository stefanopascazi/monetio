import { describe, expect, it } from "vitest";
import { filterBanks, recentBanks, recentFirst } from "./bank-options";

const banks = [
  { name: "Intesa Sanpaolo" },
  { name: "Crédit Agricole Italia" },
  { name: "BCC Ostra e Morro d'Alba" },
  { name: "Revolut" },
];

describe("filterBanks", () => {
  it("returns every bank for an empty query", () => {
    expect(filterBanks(banks, "  ")).toBe(banks);
  });

  it("matches words in any order, ignoring case and accents", () => {
    expect(filterBanks(banks, "credit").map((b) => b.name)).toEqual([
      "Crédit Agricole Italia",
    ]);
    expect(filterBanks(banks, "ostra bcc").map((b) => b.name)).toEqual([
      "BCC Ostra e Morro d'Alba",
    ]);
    expect(filterBanks(banks, "zzz")).toEqual([]);
  });
});

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
