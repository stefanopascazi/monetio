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
      { householdId: "h", accountId: "a", categories, batchId: "b1" },
    );
    expect(rows[0]).toMatchObject({ household_id: "h", account_id: "a", category_id: "spesa", kind: "expense", status: "booked", source: "import", import_batch_id: "b1", amount_cents: -120, booked_on: "2025-01-02", created_by: null });
    expect(rows[0].import_ref).toMatch(/^imp:a:2025-01-02:-120:/);
    expect(rows[1]).toMatchObject({ kind: "income", category_id: null });
    expect(importRows([], { householdId: "h", accountId: "a", categories })).toEqual([]);
    expect(importRows([{ line: 1, bookedOn: "2025-01-01", amountCents: -1, description: "x", category: null }], { householdId: "h", accountId: "a", categories })[0].import_batch_id).toBeNull();
  });

  it("books linked drafts as the transfer side of the existing movement", () => {
    const link = { id: "t1", accountId: "cherry", accountName: "Cherry", bookedOn: "2025-01-02", amountCents: -800, description: "Ricarica", categoryId: "giro" };
    const rows = importRows(
      [
        { line: 2, bookedOn: "2025-01-02", amountCents: 800, description: "Ricarica di *3210", category: "Spesa" },
        { line: 3, bookedOn: "2025-01-03", amountCents: -120, description: "Bar", category: null },
      ],
      { householdId: "h", accountId: "rev", categories, transfers: new Map([[2, link]]) },
      () => "g1",
    );
    expect(rows[0]).toMatchObject({ kind: "transfer", counterpart_account_id: "cherry", transfer_group_id: "g1", category_id: "giro", amount_cents: 800 });
    expect(rows[1]).toMatchObject({ kind: "expense", counterpart_account_id: null, transfer_group_id: null });
  });

  it("uses the category picked in the preview over every other source", () => {
    const link = { id: "t1", accountId: "cherry", accountName: "Cherry", bookedOn: "2025-01-02", amountCents: -800, description: "Ricarica", categoryId: "giro" };
    const rows = importRows(
      [
        { line: 2, bookedOn: "2025-01-02", amountCents: 800, description: "Ricarica", category: null },
        { line: 3, bookedOn: "2025-01-03", amountCents: -120, description: "Bar", category: "Spesa" },
      ],
      { householdId: "h", accountId: "rev", categories, transfers: new Map([[2, link]]), categoryByLine: new Map([[2, "extra"], [3, null]]) },
    );
    expect(rows.map((r) => r.category_id)).toEqual(["extra", null]);
  });
});
