import { describe, expect, it } from "vitest";
import { feeBreakdown } from "./fee-breakdown";

describe("feeBreakdown", () => {
  it("adds the fee to the total and describes the split", () => {
    const b = feeBreakdown(-4633, 100);
    expect(b.totalCents).toBe(-4733);
    expect(b.label).toMatch(/^46,33\s€ \+ 1,00\s€ spese$/);
  });

  it("leaves amounts without fee unchanged", () => {
    expect(feeBreakdown(-500, 0)).toEqual({ totalCents: -500, label: null });
    expect(feeBreakdown(-500, null)).toEqual({ totalCents: -500, label: null });
  });
});
