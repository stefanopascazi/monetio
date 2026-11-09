import { describe, expect, it } from "vitest";
import { visibilityTotals } from "./account-totals";

describe("visibilityTotals", () => {
  it("sums balances per visibility", () => {
    expect(
      visibilityTotals([
        { visibility: "shared", balanceCents: 1000 },
        { visibility: "private", balanceCents: -300 },
        { visibility: "shared", balanceCents: 500 },
      ]),
    ).toEqual({ shared: 1500, private: -300 });
  });
  it("returns zeros without accounts", () => {
    expect(visibilityTotals([])).toEqual({ shared: 0, private: 0 });
  });
});
