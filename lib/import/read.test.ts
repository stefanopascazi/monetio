import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { decodeText, MAX_FILE_BYTES, plainGrid, readStatement, trimGrid } from "./read";

const bytes = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;

describe("decodeText", () => {
  it("reads UTF-8 and falls back to Windows-1252", () => {
    expect(decodeText(new TextEncoder().encode("Caffè"))).toBe("Caffè");
    expect(decodeText(new Uint8Array([0x43, 0x61, 0x66, 0x66, 0xe8]))).toBe("Caffè");
  });
});

describe("plainGrid / trimGrid", () => {
  it("turns dates into ISO dates and trims empty edges", () => {
    const grid = plainGrid([[new Date(Date.UTC(2025, 0, 2)), "A", null], ["", null, null], [null, " ", null]]);
    expect(trimGrid(grid)).toEqual([["2025-01-02", "A"]]);
  });
});

describe("readStatement", () => {
  it("parses CSV files", async () => {
    expect(await readStatement("x.CSV", bytes("Data;Importo\n01/01/2025;-1"))).toEqual({ ok: true, grid: [["Data", "Importo"], ["01/01/2025", "-1"]] });
  });

  it("parses XLSX files", async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet("S").addRow(["Data", -1]);
    const res = await readStatement("x.xlsx", (await wb.xlsx.writeBuffer()) as ArrayBuffer);
    expect(res).toEqual({ ok: true, grid: [["Data", -1]] });
  });

  it.each([
    ["empty", "x.csv", new ArrayBuffer(0), "Il file è vuoto."],
    ["too big", "x.csv", new ArrayBuffer(MAX_FILE_BYTES + 1), "Il file supera i 3 MB."],
    ["unsupported", "x.pdf", bytes("%PDF"), "Formato non supportato: carica un file CSV o XLSX."],
    ["broken xlsx", "x.xlsx", bytes("not a zip"), "Non riesco a leggere il file. È un CSV o XLSX valido?"],
    ["blank", "x.csv", bytes("\n\n"), "Il file non contiene righe."],
  ])("rejects %s files", async (_, name, data, message) => {
    expect(await readStatement(name, data)).toEqual({ ok: false, message });
  });
});
