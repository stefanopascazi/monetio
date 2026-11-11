import { describe, expect, it } from "vitest";
import { parseAmount, parseDate } from "./values";

describe("parseAmount", () => {
  it.each([
    ["1.234,56", 123456],
    ["-12,30", -1230],
    ["12,30-", -1230],
    ["(12,30)", -1230],
    ["+5", 500],
    ["€ 1.000", 100000],
    ["-12.50", -1250],
    ["1,234.56", 123456],
    ["1.234.567", 123456700],
    ["1,234,567", 123456700],
    ["1 234,56 EUR", 123456],
    ["0,005", 1],
  ])("%s -> %i", (input, cents) => {
    expect(parseAmount(input)).toBe(cents);
  });

  it("reads numbers from spreadsheets", () => {
    expect(parseAmount(-12.3)).toBe(-1230);
    expect(parseAmount(0.1 + 0.2)).toBe(30);
  });

  it.each(["", "abc", "12,3,4x", "--5"])("rejects %j", (input) => {
    expect(parseAmount(input)).toBeNull();
  });

  it("rejects non-text cells", () => {
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount(new Date())).toBeNull();
    expect(parseAmount(Number.NaN)).toBeNull();
  });
});

describe("parseDate", () => {
  it.each([
    ["31/12/2025", "2025-12-31"],
    ["1-2-25", "2025-02-01"],
    ["05.01.2024 10:22", "2024-01-05"],
    ["2024-01-05", "2024-01-05"],
    ["2024-01-05 10:22:11", "2024-01-05"],
    ["2024-01-05T10:22:11Z", "2024-01-05"],
  ])("%s -> %s", (input, iso) => {
    expect(parseDate(input)).toBe(iso);
  });

  it("supports month-first order", () => {
    expect(parseDate("12/31/2025", "mdy")).toBe("2025-12-31");
  });

  it("rejects impossible dates and text", () => {
    expect(parseDate("31/02/2025")).toBeNull();
    expect(parseDate("Saldo finale")).toBeNull();
    expect(parseDate("")).toBeNull();
  });

  it("reads Excel serials and Date cells", () => {
    expect(parseDate(45658)).toBe("2025-01-01");
    expect(parseDate(45658.75)).toBe("2025-01-01");
    expect(parseDate(new Date(Date.UTC(2025, 0, 2)))).toBe("2025-01-02");
    expect(parseDate(12.5)).toBeNull();
  });
});
