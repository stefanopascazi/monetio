import { describe, expect, it } from "vitest";
import { foldText, matchesQuery } from "./search";

describe("search", () => {
  it("folds case and accents", () => {
    expect(foldText("  Crédit Agricole ")).toBe("credit agricole");
  });

  it("matches every word in any order", () => {
    expect(matchesQuery("BCC Ostra e Morro d'Alba", "ostra bcc")).toBe(true);
    expect(matchesQuery("Crédit Agricole", "CREDIT")).toBe(true);
    expect(matchesQuery("Revolut", "revo x")).toBe(false);
  });

  it("matches everything for an empty query", () => {
    expect(matchesQuery("Revolut", "   ")).toBe(true);
  });
});
