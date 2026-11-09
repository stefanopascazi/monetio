import { describe, expect, it } from "vitest";
import type { DetailItem, ProjectionDetailMonth } from "../domain/projection-details";
import { detailMonthViews } from "./projection-detail-view";

const item = (label: string, amountCents: number, p: Partial<DetailItem> = {}): DetailItem => ({ label, amountCents, source: "rule", count: 1, overdue: false, ...p });

const details: ProjectionDetailMonth[] = [
  {
    month: "2026-11",
    byAccount: {
      joint: { openingCents: 1000, closingCents: 1500, items: [item("Quota Ste", 800), item("Mutuo", -300)] },
      ste: { openingCents: 2000, closingCents: 1200, items: [item("Quota Ste", -800)] },
    },
  },
];

describe("detailMonthViews", () => {
  it("splits income and expense for one account", () => {
    const [v] = detailMonthViews(details, ["joint"]);
    expect(v).toMatchObject({ openingCents: 1000, closingCents: 1500, netCents: 500 });
    expect(v.income.map((x) => x.label)).toEqual(["Quota Ste"]);
    expect(v.expense.map((x) => x.label)).toEqual(["Mutuo"]);
  });

  it("keeps booked lines apart and nets booked transfers of merged accounts", () => {
    const withBooked: ProjectionDetailMonth[] = [
      {
        month: "2026-11",
        byAccount: {
          joint: { openingCents: 0, closingCents: 0, items: [item("Spesa", -500, { source: "booked" }), item("Giroconti", 300, { source: "booked" })] },
          ste: { openingCents: 0, closingCents: 0, items: [item("Giroconti", -300, { source: "booked" }), item("Mutuo", -100)] },
        },
      },
    ];
    const [one] = detailMonthViews(withBooked, ["joint"]);
    expect(one.bookedExpense.map((x) => x.label)).toEqual(["Spesa"]);
    expect(one.bookedIncome.map((x) => x.label)).toEqual(["Giroconti"]);
    expect(one.expense).toEqual([]);
    const [all] = detailMonthViews(withBooked, ["joint", "ste"]);
    expect(all.bookedExpense.map((x) => x.label)).toEqual(["Spesa"]);
    expect(all.bookedIncome).toEqual([]);
    expect(all.expense.map((x) => x.label)).toEqual(["Mutuo"]);
  });

  it("cancels transfers between merged accounts", () => {
    const [v] = detailMonthViews(details, ["joint", "ste"]);
    expect(v).toMatchObject({ openingCents: 3000, closingCents: 2700, netCents: -300 });
    expect(v.items.map((x) => x.label)).toEqual(["Mutuo"]);
  });
});
