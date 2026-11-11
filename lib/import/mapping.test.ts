import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import { findHeaderRow, guessMapping, mapRows } from "./mapping";
import type { ColumnMapping } from "./types";

const SPLIT = parseCsv(
  [
    "Elenco movimenti;;;;",
    "Conto;IT00X000;;;",
    ";;;;",
    "Data contabile;Data valuta;Descrizione;Accrediti;Addebiti",
    "02/01/2025;02/01/2025;Stipendio;2.100,00;",
    "03/01/2025;03/01/2025;Pagamento POS Conad;;45,10",
    ";;;;",
    "Saldo finale;;;;2.054,90",
  ].join("\n"),
);

const SIGNED = parseCsv(
  "Type,Started Date,Completed Date,Description,Amount,Currency\nCARD_PAYMENT,2025-01-05 10:22:11,2025-01-06 08:00:00,Coffee,-1.20,EUR\nTOPUP,2025-01-07 09:00:00,2025-01-07 09:00:01,Top-up,100.00,EUR",
);

describe("findHeaderRow / guessMapping", () => {
  it("skips the preamble and prefers the booking date over the value date", () => {
    expect(findHeaderRow(SPLIT)).toBe(3);
    expect(guessMapping(SPLIT)).toEqual({ headerRow: 3, date: 0, description: 2, amount: { mode: "split", inflow: 3, outflow: 4 } });
  });

  it("maps a signed amount export", () => {
    expect(guessMapping(SIGNED)).toEqual({ headerRow: 0, date: 1, description: 3, amount: { mode: "signed", column: 4 } });
  });

  it("detects a category column and accented headers", () => {
    const grid = parseCsv("Data;Descrizione;Importo;Categoria\n01/01/2025;X;-1;Spesa");
    expect(guessMapping(grid)?.category).toBe(3);
  });

  it("returns null when columns cannot be recognised", () => {
    expect(guessMapping(parseCsv("a;b;c\n1;2;3"))).toBeNull();
    // Date and amount but no description.
    expect(guessMapping(parseCsv("Data;Importo\n01/01/2025;5"))).toBeNull();
  });
});

describe("mapRows", () => {
  it("maps split columns, ignores blank rows and reports footers", () => {
    const { drafts, skipped } = mapRows(SPLIT, guessMapping(SPLIT)!);
    expect(drafts).toEqual([
      { line: 5, bookedOn: "2025-01-02", amountCents: 210000, description: "Stipendio", category: null },
      { line: 6, bookedOn: "2025-01-03", amountCents: -4510, description: "Pagamento POS Conad", category: null },
    ]);
    expect(skipped).toEqual([{ line: 8, reason: "Data non valida" }]);
  });

  it("maps signed amounts and can invert them (card exports)", () => {
    const mapping = guessMapping(SIGNED)!;
    expect(mapRows(SIGNED, mapping).drafts.map((d) => d.amountCents)).toEqual([-120, 10000]);
    const inverted: ColumnMapping = { ...mapping, amount: { mode: "signed", column: 4, invert: true } };
    expect(mapRows(SIGNED, inverted).drafts.map((d) => d.amountCents)).toEqual([120, -10000]);
  });

  it("joins extra description columns and reads the category", () => {
    const grid = parseCsv("Data;Causale;Dettagli;Importo;Cat\n01/01/2025;Bonifico;Mario;-10;Casa\n02/01/2025;POS;;-2;");
    const mapping: ColumnMapping = { headerRow: 0, date: 0, description: 1, extraDescription: [2], amount: { mode: "signed", column: 3 }, category: 4 };
    expect(mapRows(grid, mapping).drafts).toEqual([
      { line: 2, bookedOn: "2025-01-01", amountCents: -1000, description: "Bonifico - Mario", category: "Casa" },
      { line: 3, bookedOn: "2025-01-02", amountCents: -200, description: "POS", category: null },
    ]);
  });

  it("reports invalid and zero amounts, and fills an empty description", () => {
    const grid = parseCsv("Data;Descrizione;Importo\n01/01/2025;A;abc\n02/01/2025;B;0\n03/01/2025;;-1");
    const { drafts, skipped } = mapRows(grid, guessMapping(grid)!);
    expect(skipped).toEqual([
      { line: 2, reason: "Importo non valido" },
      { line: 3, reason: "Importo pari a zero" },
    ]);
    expect(drafts[0].description).toBe("Movimento importato");
  });

  it("uses Excel values as they are", () => {
    const grid = [["Data", "Descrizione", "Importo"], [new Date(Date.UTC(2025, 0, 2)), "Luce", -80.5]];
    expect(mapRows(grid, guessMapping(grid)!).drafts[0]).toMatchObject({ bookedOn: "2025-01-02", amountCents: -8050 });
  });
});
