import { describe, expect, it } from "vitest";
import type { DetailItem, ProjectionDetailMonth } from "./projection-details";
import { yearlyDetails } from "./projection-yearly";

const item = (label: string, amountCents: number): DetailItem => ({ label, amountCents, source: "rule", count: 1, overdue: false });
const month = (m: string, opening: number, closing: number, items: DetailItem[]): ProjectionDetailMonth => ({
  month: m,
  byAccount: { a: { openingCents: opening, closingCents: closing, items } },
});

describe("yearlyDetails", () => {
  it("sums lines per calendar year, keeping first opening and last closing", () => {
    const res = yearlyDetails([
      month("2026-11", 1000, 900, [item("Mutuo", -100)]),
      month("2026-12", 900, 1300, [item("Mutuo", -100), item("Tredicesima", 500)]),
      month("2027-01", 1300, 1200, [item("Mutuo", -100)]),
    ]);
    expect(res.map((y) => [y.month, y.months])).toEqual([
      ["2026", 2],
      ["2027", 1],
    ]);
    expect(res[0].byAccount.a).toMatchObject({ openingCents: 1000, closingCents: 1300 });
    expect(res[0].byAccount.a.items.map((x) => [x.label, x.amountCents, x.count])).toEqual([
      ["Mutuo", -200, 2],
      ["Tredicesima", 500, 1],
    ]);
  });
});
