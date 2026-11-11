import { describe, expect, it } from "vitest";
import type { Category } from "../domain/types";
import { importRows, matchCategory } from "./rows";

const cat = (id: string, name: string, kind: Category["kind"], archived = false): Category => ({ id, name, kind, icon: null, colorIndex: 1, archived });
const categories = [cat("spesa", "Spesa", "expense"), cat("stip", "Stipendio", "income"), cat("extra", "Extra", "both"), cat("old", "Vecchia", "expense", true)];

describe("matchCategory", () => {
  it("matches by normalised name and compatible kind", () => {
    expect(matchCategory(" SPESA ", -100, categories)).toBe("spesa");
    expect(matchCategory("extra", 100, categories)).toBe("extra");
    expect(matchCategory("Stipendio", -100, categories)).toBeNull();
    expect(matchCategory("Vecchia", -100, categories)).toBeNull();
    expect(matchCategory(null, -100, categories)).toBeNull();
  });
});

describe("importRows", () => {
  it("builds booked import rows with refs and kinds", () => {
    const rows = importRows(
      [
        { line: 2, bookedOn: "2025-01-02", amountCents: -120, description: "Bar", category: "Spesa" },
        { line: 3, bookedOn: "2025-01-03", amountCents: 1000, description: "Rimborso", category: null },
      ],
      { householdId: "h", accountId: "a", categories },
    );
    expect(rows[0]).toMatchObject({ household_id: "h", account_id: "a", category_id: "spesa", kind: "expense", status: "booked", source: "import", amount_cents: -120, booked_on: "2025-01-02", created_by: null });
    expect(rows[0].import_ref).toMatch(/^imp:a:2025-01-02:-120:/);
    expect(rows[1]).toMatchObject({ kind: "income", category_id: null });
  });
});
