import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { plainValue, readXlsxGrid } from "./xlsx";

describe("plainValue", () => {
  it("unwraps formulas, rich text and hyperlinks", () => {
    expect(plainValue({ formula: "A1*2", result: 4 } as ExcelJS.CellValue)).toBe(4);
    expect(plainValue({ richText: [{ text: "Ca" }, { text: "sa" }] } as ExcelJS.CellValue)).toBe("Casa");
    expect(plainValue({ text: "link", hyperlink: "https://x" } as ExcelJS.CellValue)).toBe("link");
    expect(plainValue(true)).toBe("true");
    expect(plainValue(null)).toBeNull();
  });
});

describe("readXlsxGrid", () => {
  it("reads the first non-empty sheet as a grid", async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet("Vuoto");
    const ws = wb.addWorksheet("Movimenti");
    ws.addRow(["Data", "Descrizione", "Importo"]);
    ws.addRow([new Date(Date.UTC(2025, 0, 2)), "Luce", -80.5]);
    ws.addRow([new Date(Date.UTC(2025, 0, 3)), "Totale", { formula: "C2", result: -80.5 }]);
    const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;

    const grid = await readXlsxGrid(buffer);
    expect(grid[0]).toEqual(["Data", "Descrizione", "Importo"]);
    expect(grid[1]).toEqual([new Date(Date.UTC(2025, 0, 2)), "Luce", -80.5]);
    expect(grid[2][2]).toBe(-80.5);
  });
});
