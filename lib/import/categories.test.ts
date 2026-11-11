import { describe, expect, it } from "vitest";
import type { Category } from "../domain/types";
import { suggestCategories, validCategory } from "./categories";

const cat = (id: string, name: string, kind: Category["kind"], archived = false): Category => ({ id, name, kind, icon: null, colorIndex: 1, archived });
const categories = [cat("abb", "Abbonamenti", "expense"), cat("luce", "Luce", "expense"), cat("stip", "Stipendio", "income"), cat("old", "Vecchia", "expense", true), cat("extra", "Extra", "both")];
const d = (line: number, description: string, amountCents: number, category: string | null = null) => ({ line, bookedOn: "2026-11-01", amountCents, description, category });

describe("suggestCategories", () => {
  const history = [
    { description: "Netflix", amountCents: -1399, categoryId: "abb" },
    { description: "Netflix", amountCents: -1399, categoryId: "abb" },
    { description: "Netflix", amountCents: -1399, categoryId: "extra" },
    { description: "Luce Sorgenia", amountCents: -7000, categoryId: "luce" },
    { description: "Stipendio ACME", amountCents: 210000, categoryId: "stip" },
    { description: "Vecchio fornitore", amountCents: -100, categoryId: "old" },
  ];

  it("learns from similar past descriptions, preferring the most used category", () => {
    const res = suggestCategories(
      [d(1, "Pagamenti paesi UE C/O NETFLIX.COM CARTA N. 1234", -1399), d(2, "ADDEBITO DIRETTO SORGENIA S.P.A.", -2725), d(3, "BONIFICO ACME STIPENDIO NOVEMBRE", 215000)],
      history,
      categories,
    );
    expect([...res]).toEqual([
      [1, "abb"],
      [2, "luce"],
      [3, "stip"],
    ]);
  });

  it("keeps the direction of money, skips archived categories and unknown merchants", () => {
    const res = suggestCategories([d(1, "Rimborso Netflix", 1399), d(2, "Vecchio fornitore", -100), d(3, "Pizzeria Da Mario", -2500)], history, categories);
    expect([...res]).toEqual([]);
  });

  it("matches brand names written as one word in the history", () => {
    const res = suggestCategories([d(1, "ADDEBITO DIRETTO TELEFONIA UNO S.P.A.", -2699)], [{ description: "TelefoniaUno", amountCents: -3598, categoryId: "abb" }], categories);
    expect(res.get(1)).toBe("abb");
  });

  it("uses a category named in the file first", () => {
    expect(suggestCategories([d(1, "Netflix", -1399, "luce")], history, categories).get(1)).toBe("luce");
  });
});

describe("validCategory", () => {
  it("accepts only active categories of the right kind", () => {
    expect(validCategory("abb", -100, categories)).toBe("abb");
    expect(validCategory("extra", 100, categories)).toBe("extra");
    expect(validCategory("stip", -100, categories)).toBeNull();
    expect(validCategory("old", -100, categories)).toBeNull();
    expect(validCategory("missing", -100, categories)).toBeNull();
    expect(validCategory(null, -100, categories)).toBeNull();
  });
});
