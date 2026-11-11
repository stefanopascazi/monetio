import { describe, expect, it } from "vitest";
import { MAX_IMPORT_ROWS, parseDrafts } from "./payload";

const ok = { line: 2, bookedOn: "2025-01-02", amountCents: -120, description: " Bar ", category: " Spesa " };

describe("parseDrafts", () => {
  it("accepts and trims valid drafts", () => {
    expect(parseDrafts([ok, { ...ok, line: 3, category: null }])).toEqual([
      { line: 2, bookedOn: "2025-01-02", amountCents: -120, description: "Bar", category: "Spesa" },
      { line: 3, bookedOn: "2025-01-02", amountCents: -120, description: "Bar", category: null },
    ]);
  });

  it("caps long text", () => {
    expect(parseDrafts([{ ...ok, description: "x".repeat(900) }])![0].description).toHaveLength(500);
  });

  it.each([
    ["not a list", "x"],
    ["empty list", []],
    ["bad date", [{ ...ok, bookedOn: "02/01/2025" }]],
    ["zero amount", [{ ...ok, amountCents: 0 }]],
    ["fractional cents", [{ ...ok, amountCents: 1.5 }]],
    ["blank description", [{ ...ok, description: "  " }]],
    ["bad line", [{ ...ok, line: 0 }]],
    ["bad category", [{ ...ok, category: 3 }]],
    ["null row", [null]],
  ])("rejects %s", (_, input) => {
    expect(parseDrafts(input)).toBeNull();
  });

  it("rejects too many rows", () => {
    expect(parseDrafts(Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => ({ ...ok, line: i + 1 })))).toBeNull();
  });
});
