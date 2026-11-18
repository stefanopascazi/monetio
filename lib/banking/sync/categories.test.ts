import { describe, expect, it } from "vitest";
import type { Category } from "../../domain/types";
import { withSuggestedCategories } from "./categories";
import type { Decision } from "./match";

const cat = (id: string, name: string, kind: Category["kind"]): Category => ({ id, name, kind, icon: null, colorIndex: 1, archived: false });
const categories = [cat("spesa", "Spesa", "expense"), cat("stip", "Stipendio", "income")];
const history = [
  { description: "ESSELUNGA MILANO", amountCents: -4500, categoryId: "spesa" },
  { description: "ACME SPA STIPENDIO", amountCents: 200000, categoryId: "stip" },
];
const mov = (ref: string, description: string, amountCents: number) => ({ ref, bookedOn: "2026-11-17", amountCents, description, counterpartyIban: null });

describe("withSuggestedCategories", () => {
  it("proposes a category for inserted movements only", () => {
    const decisions: Decision[] = [
      { type: "insert", movement: mov("a", "ESSELUNGA MILANO", -3000) },
      { type: "insert", movement: mov("b", "Bonifico sconosciuto", -100) },
      { type: "skip", movement: mov("c", "Bar", -10) },
    ];
    const out = withSuggestedCategories(decisions, { history, categories });
    expect(out[0]).toMatchObject({ type: "insert", categoryId: "spesa" });
    expect(out[1]).not.toHaveProperty("categoryId");
    expect(out[2]).not.toHaveProperty("categoryId");
  });

  it("keeps the direction of money", () => {
    const out = withSuggestedCategories([{ type: "insert", movement: mov("a", "ACME SPA STIPENDIO", -5000) }], { history, categories });
    expect(out[0]).not.toHaveProperty("categoryId");
  });

  it("returns the decisions untouched without history", () => {
    const d: Decision[] = [{ type: "insert", movement: mov("a", "ESSELUNGA", -1) }];
    expect(withSuggestedCategories(d, { history: [], categories })).toBe(d);
  });
});
