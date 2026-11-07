import { describe, expect, it } from "vitest";
import { dateParam, monthParam, pageSizeParam, searchTerm, stringParam, takePage, withQuery, yearParam } from "./params";

describe("params", () => {
  it("parses months and years with fallbacks", () => {
    expect(monthParam("2026-03", "2026-11")).toBe("2026-03");
    expect(monthParam("2026-13", "2026-11")).toBe("2026-11");
    expect(monthParam(["2025-01"], "x")).toBe("2025-01");
    expect(yearParam("2024", 2026)).toBe(2024);
    expect(yearParam("abc", 2026)).toBe(2026);
  });

  it("trims strings and builds queries", () => {
    expect(stringParam("  ")).toBeUndefined();
    expect(stringParam(" bar ")).toBe("bar");
    expect(withQuery("/movimenti", { mese: "2026-11", conto: undefined, q: "" })).toBe("/movimenti?mese=2026-11");
    expect(withQuery("/x", {})).toBe("/x");
  });

  it("accepts only real calendar dates", () => {
    expect(dateParam("2026-02-28")).toBe("2026-02-28");
    expect(dateParam(["2024-02-29"])).toBe("2024-02-29");
    expect(dateParam("2026-02-30")).toBeUndefined();
    expect(dateParam("2026-2-1")).toBeUndefined();
    expect(dateParam(undefined)).toBeUndefined();
  });
});

describe("pageSizeParam", () => {
  it("rounds up to the step and caps at the max", () => {
    expect(pageSizeParam(undefined)).toBe(50);
    expect(pageSizeParam("abc")).toBe(50);
    expect(pageSizeParam("-10")).toBe(50);
    expect(pageSizeParam("100")).toBe(100);
    expect(pageSizeParam("120")).toBe(150);
    expect(pageSizeParam(["200"])).toBe(200);
    expect(pageSizeParam("99999")).toBe(1000);
  });
});

describe("searchTerm", () => {
  it("drops LIKE wildcards and blanks", () => {
    expect(searchTerm(" luce ")).toBe("luce");
    expect(searchTerm("50%_off")).toBe("50off");
    expect(searchTerm("%_")).toBeUndefined();
    expect(searchTerm(undefined)).toBeUndefined();
  });
});

describe("takePage", () => {
  it("cuts the extra row and reports it", () => {
    expect(takePage([1, 2, 3], 2)).toEqual({ page: [1, 2], hasMore: true });
    expect(takePage([1, 2], 2)).toEqual({ page: [1, 2], hasMore: false });
    expect(takePage([], 2)).toEqual({ page: [], hasMore: false });
  });
});
