import { describe, expect, it } from "vitest";
import type { Category } from "../../domain/types";
import { withMatchedCategories } from "./categories";
import type { Decision } from "./match";

const cat = (id: string, name: string, kind: Category["kind"]): Category => ({ id, name, kind, icon: null, colorIndex: 1, archived: false });
const categories = [cat("spesa", "Spesa", "expense"), cat("stip", "Stipendio", "income")];
const matches = [
  { key: "esselunga milano", direction: -1 as const, categoryId: "spesa" },
  { key: "acme spa stipendio", direction: 1 as const, categoryId: "stip" },
];
const mov = (ref: string, description: string, amountCents: number) => ({ ref, bookedOn: "2026-11-17", amountCents, description, counterpartyIban: null });

describe("withMatchedCategories", () => {
  it("gives the matched category to inserted movements only", () => {
    const decisions: Decision[] = [
      { type: "insert", movement: mov("a", "ESSELUNGA MILANO 17/11", -3000) },
      { type: "insert", movement: mov("b", "ESSELUNGA ROMA", -100) },
      { type: "skip", movement: mov("c", "ESSELUNGA MILANO", -10) },
    ];
    const out = withMatchedCategories(decisions, { matches, categories });
    expect(out[0]).toMatchObject({ type: "insert", categoryId: "spesa" });
    expect(out[1]).not.toHaveProperty("categoryId");
    expect(out[2]).not.toHaveProperty("categoryId");
  });

  it("keeps the direction of money", () => {
    const out = withMatchedCategories([{ type: "insert", movement: mov("a", "ACME SPA STIPENDIO", -5000) }], { matches, categories });
    expect(out[0]).not.toHaveProperty("categoryId");
  });

  it("returns the decisions untouched without matches", () => {
    const d: Decision[] = [{ type: "insert", movement: mov("a", "ESSELUNGA", -1) }];
    expect(withMatchedCategories(d, { matches: [], categories })).toBe(d);
  });
});
