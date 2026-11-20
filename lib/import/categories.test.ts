import { describe, expect, it } from "vitest";
import type { Category } from "../domain/types";
import { validCategory } from "./categories";

const cat = (id: string, name: string, kind: Category["kind"], archived = false): Category => ({ id, name, kind, icon: null, colorIndex: 1, archived });
const categories = [cat("abb", "Abbonamenti", "expense"), cat("luce", "Luce", "expense"), cat("stip", "Stipendio", "income"), cat("old", "Vecchia", "expense", true), cat("extra", "Extra", "both")];

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
