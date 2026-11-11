import { describe, expect, it } from "vitest";
import { balanceHistory, lastMonths, openingBalancesBefore, projectionPoints, yearBalancePoints } from "./history";

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

  it("adds a band that widens with the months ahead", () => {
    const months = [
      { month: "2026-11", byAccount: {}, totalCents: 1000 },
      { month: "2026-12", byAccount: {}, totalCents: 1000 },
    ];
    const pts = projectionPoints([], months, (p) => p.totalCents, (n) => n * 100);
    expect(pts.map((p) => [p.lowCents, p.highCents])).toEqual([
      [900, 1100],
      [800, 1200],
    ]);
    expect(projectionPoints([], months, (p) => p.totalCents, () => 0)[0]).not.toHaveProperty("lowCents");
  });

  it("adds the year when months would repeat", () => {
    const projection = Array.from({ length: 13 }, (_, i) => ({ month: `20${27 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`, byAccount: {}, totalCents: 0 }));
    const labels = projectionPoints([], projection, (p) => p.totalCents).map((p) => p.label);
    expect(labels[0]).toBe("gen 2027");
    expect(new Set(labels).size).toBe(13);
  });
});

describe("openingBalancesBefore", () => {
  const rows = [
    { accountId: "a", month: "2026-01", balanceCents: 100 },
    { accountId: "a", month: "2026-03", balanceCents: 300 },
    { accountId: "a", month: "2026-06", balanceCents: 600 },
  ];
  const accounts = [
    { id: "a", openingDate: "2025-12-01", openingBalanceCents: 10 },
    { id: "b", openingDate: "2025-01-10", openingBalanceCents: 70 },
    { id: "c", openingDate: "2026-05-02", openingBalanceCents: 90 },
  ];

  it("takes the last month-end before the first month, else the opening balance of open accounts", () => {
    expect(openingBalancesBefore(rows, accounts, "2026-05")).toEqual({ a: 300, b: 70 });
  });
});

describe("yearBalancePoints", () => {
  it("keeps one account within the year", () => {
    const rows = [
      { accountId: "a", month: "2025-12", balanceCents: 1 },
      { accountId: "a", month: "2026-01", balanceCents: 2 },
      { accountId: "b", month: "2026-02", balanceCents: 3 },
      { accountId: "a", month: "2026-12", balanceCents: 4 },
    ];
    expect(yearBalancePoints(rows, "a", 2026).map((p) => p.valueCents)).toEqual([2, 4]);
  });
});
