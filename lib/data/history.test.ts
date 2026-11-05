import { describe, expect, it } from "vitest";
import { balanceHistory, lastMonths, projectionPoints } from "./history";

describe("lastMonths", () => {
  it("returns n months ending with current", () => {
    expect(lastMonths("2026-02", 3)).toEqual(["2025-12", "2026-01", "2026-02"]);
  });
});

describe("balanceHistory", () => {
  it("carries balances forward and sums accounts", () => {
    const rows = [
      { accountId: "a", month: "2026-08", balanceCents: 100 },
      { accountId: "a", month: "2026-10", balanceCents: 300 },
      { accountId: "b", month: "2026-09", balanceCents: 50 },
    ];
    expect(balanceHistory(rows, ["a", "b"], ["2026-08", "2026-09", "2026-10"], { b: 20 })).toEqual([120, 150, 350]);
  });
});

describe("projectionPoints", () => {
  it("appends projected points after history", () => {
    const pts = projectionPoints([{ month: "2026-10", valueCents: 5 }], [{ month: "2026-11", byAccount: { a: 7 }, totalCents: 7 }], (p) => p.totalCents);
    expect(pts).toEqual([
      { label: "ott", valueCents: 5 },
      { label: "nov", valueCents: 7, projected: true },
    ]);
  });
});
