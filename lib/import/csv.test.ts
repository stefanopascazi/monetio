import { describe, expect, it } from "vitest";
import { detectDelimiter, parseCsv } from "./csv";

describe("detectDelimiter", () => {
  it("prefers semicolon in Italian exports", () => {
    expect(detectDelimiter("Data;Descrizione;Importo\n01/02/2025;Spesa, Conad;-12,30\n")).toBe(";");
  });

  it("detects comma and tab", () => {
    expect(detectDelimiter("Date,Description,Amount\n2025-01-02,Coffee,-1.20")).toBe(",");
    expect(detectDelimiter("a\tb\tc\n1\t2\t3")).toBe("\t");
  });

  it("ignores a narrower preamble", () => {
    const text = "Estratto conto;Conto 123\n\nData;Descrizione;Importo;Saldo\n01/02/2025;A;-1,00;10,00\n02/02/2025;B;-2,00;8,00";
    expect(detectDelimiter(text)).toBe(";");
  });
});

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, CRLF and BOM", () => {
    const text = '﻿Data;Descrizione\r\n01/02/2025;"Pagamento ""POS""; Conad"\r\n';
    expect(parseCsv(text)).toEqual([
      ["Data", "Descrizione"],
      ["01/02/2025", 'Pagamento "POS"; Conad'],
    ]);
  });

  it("keeps newlines inside quoted fields and trims cells", () => {
    expect(parseCsv('a,b\n" x\ny ", z ', ",")).toEqual([
      ["a", "b"],
      ["x\ny", "z"],
    ]);
  });

  it("keeps empty fields", () => {
    expect(parseCsv("a;;c\n", ";")).toEqual([["a", "", "c"]]);
  });
});
