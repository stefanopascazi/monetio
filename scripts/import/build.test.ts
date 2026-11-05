import { describe, expect, it } from "vitest";
import { buildImport, type SheetRow } from "./build";

const rows: SheetRow[] = [
  { row: 3, year: 2022, month: 1, cells: { D: { value: 3900 } } },
  {
    row: 4,
    year: 2022,
    month: 2,
    cells: {
      D: { value: 4404.35 },
      F: { value: 800 },
      H: { value: -800 },
      X: { value: -226, comment: "e-distribuzione" },
      M: { value: -74.1, formula: "=-(17+57.1)" },
    },
  },
  { row: 5, year: 2022, month: 3, cells: { D: { value: 4304.35, formula: "=D4+H5" }, H: { value: -100 } } },
];

describe("buildImport", () => {
  const res = buildImport(rows);
  const joint = res.transactions.filter((t) => t.account === "joint");

  it("uses a constant first balance as opening and skips that row's cells", () => {
    expect(res.accounts.find((a) => a.key === "joint")).toEqual({
      key: "joint",
      openingCents: 390000,
      openingDate: "2022-01-31",
      finalCents: 430435,
    });
  });

  it("creates one transaction per cell with kind, transfer and comment description", () => {
    expect(joint.find((t) => t.ref === "xlsx:F4")).toMatchObject({ kind: "transfer", counterpart: "ste", amountCents: 80000, date: "2022-02-01" });
    expect(joint.find((t) => t.ref === "xlsx:X4")).toMatchObject({ kind: "expense", description: "E-distribuzione", notes: "Luce", category: "Luce" });
    expect(joint.find((t) => t.ref === "xlsx:M4")?.notes).toBe("Dettaglio: -17,00 · -57,10");
  });

  it("adds an adjustment when the sheet balance differs from the cells", () => {
    // 3900 + 800 - 800 - 226 - 74.1 = 3599.90, sheet says 4404.35.
    expect(joint.find((t) => t.ref === "xlsx:adj:D4")).toMatchObject({ amountCents: 80445, kind: "adjustment", date: "2022-02-28" });
    expect(joint.some((t) => t.ref === "xlsx:adj:D5")).toBe(false);
  });

  it("warns about accounts without balances", () => {
    expect(res.warnings).toContain("Conto Ste: nessun saldo trovato");
  });
});
