import { describe, expect, it } from "vitest";
import { monthParam, stringParam, withQuery, yearParam } from "./params";

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
});
