import { describe, expect, it } from "vitest";
import type { DetailItem, ProjectionDetailMonth } from "../domain/projection-details";
import { BOOKED_LINE, projectionGrid, TRANSFERS_CATEGORY } from "./projection-grid";

const it_ = (label: string, amountCents: number, p: Partial<DetailItem> = {}): DetailItem => ({ label, amountCents, source: "rule", count: 1, overdue: false, ...p });
const names = { home: "Casa", food: "Spesa", pay: "Stipendio" };

const periods: ProjectionDetailMonth[] = [
  {
    month: "2026-11",
    byAccount: {
      joint: {
        openingCents: 10000,
        closingCents: 9000,
        items: [
          it_("Spesa", -4200, { source: "booked", categoryId: "food" }),
          it_("Supermercato", -1800, { source: "estimate", categoryId: "food" }),
          it_("Rimborso", 1000, { source: "booked", categoryId: "food" }),
          it_("Quota da Ste", 3000, { source: "contribution", transfer: true, counterpartId: "ste" }),
          it_("Mutuo", -500, { categoryId: "home" }),
        ],
      },
      ste: { openingCents: 5000, closingCents: 2000, items: [it_("Quota da Ste", -3000, { source: "contribution", transfer: true, counterpartId: "joint" })] },
    },
  },
  {
    month: "2026-12",
    byAccount: {
      joint: { openingCents: 9000, closingCents: 11000, items: [it_("Stipendio", 2500, { categoryId: "pay" }), it_("Mutuo", -500, { categoryId: "home" })] },
      ste: { openingCents: 2000, closingCents: 2000, items: [] },
    },
  },
];

describe("projectionGrid", () => {
  it("builds group, category and line rows per period, booked apart from expected", () => {
    const g = projectionGrid(periods, ["joint"], names, "2026-11");
    expect(g.columns.map((c) => [c.key, c.current])).toEqual([
      ["2026-11", true],
      ["2026-12", false],
    ]);
    const expense = g.groups.find((x) => x.id === "expense")!;
    expect(expense.categories.map((c) => c.label)).toEqual(["Spesa", "Casa"]);
    const food = expense.categories[0];
    expect(food.cells[0]).toEqual({ bookedCents: -4200, expectedCents: -1800, totalCents: -6000 });
    expect(food.lines.map((l) => l.label)).toEqual([BOOKED_LINE, "Supermercato"]);
    const income = g.groups.find((x) => x.id === "income")!;
    expect(income.categories.map((c) => c.label)).toEqual([TRANSFERS_CATEGORY, "Stipendio", "Spesa"]);
    expect(g.openingCents).toEqual([10000, 9000]);
    expect(g.closingCents).toEqual([9000, 11000]);
    expect(g.netCents).toEqual([-1000, 2000]);
  });

  it("drops transfers between merged accounts", () => {
    const g = projectionGrid(periods, ["joint", "ste"], names, "2026-11");
    const all = g.groups.flatMap((x) => x.categories.map((c) => c.label));
    expect(all).not.toContain(TRANSFERS_CATEGORY);
    expect(g.openingCents[0]).toBe(15000);
  });

  it("marks the yearly column holding the current month", () => {
    const g = projectionGrid([{ ...periods[0], month: "2026", months: 2 }], ["joint"], names, "2026-11");
    expect(g.columns).toEqual([{ key: "2026", current: true, months: 2 }]);
  });
});
