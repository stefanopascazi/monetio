import { describe, expect, it } from "vitest";
import { addendsNote, isConstantFormula, parseAddends } from "./formula";

describe("parseAddends", () => {
  it("splits inline sums", () => {
    expect(parseAddends("=-17.4-100-9.3+13.61")).toEqual([-17.4, -100, -9.3, 13.61]);
    expect(parseAddends("=+0.3-15.62")).toEqual([0.3, -15.62]);
    expect(parseAddends("=- 24.7")).toEqual([-24.7]);
    expect(parseAddends("=1120")).toEqual([1120]);
  });

  it("negates a grouped sum", () => {
    expect(parseAddends("=-(267+2.5)")).toEqual([-267, -2.5]);
  });

  it("rejects references and functions", () => {
    expect(parseAddends("=-AG40")).toBeNull();
    expect(parseAddends("=CEILING( AA40/2,-1)")).toBeNull();
    expect(parseAddends("=-$AE$1")).toBeNull();
    expect(parseAddends("=-(BK9+BL9)")).toBeNull();
  });
});

describe("isConstantFormula", () => {
  it("treats missing and numeric formulas as constants", () => {
    expect(isConstantFormula(undefined)).toBe(true);
    expect(isConstantFormula("=100")).toBe(true);
    expect(isConstantFormula("=SUM($AU$37:AW37)")).toBe(false);
  });
});

describe("addendsNote", () => {
  it("lists addends in Italian format only for multi-part sums", () => {
    expect(addendsNote("=-56.96-26.98")).toBe("Dettaglio: -56,96 · -26,98");
    expect(addendsNote("=-280.57")).toBeNull();
    expect(addendsNote(undefined)).toBeNull();
  });
});
