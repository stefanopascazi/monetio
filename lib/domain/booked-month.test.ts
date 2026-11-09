import { describe, expect, it } from "vitest";
import { type BookedRow, bookedItems, TRANSFERS_LABEL, UNCATEGORIZED_LABEL, withBookedMonth } from "./booked-month";
import type { ProjectionDetailMonth } from "./projection-details";

const row = (amountCents: number, p: Partial<BookedRow> = {}): BookedRow => ({
  accountId: "a",
  counterpartAccountId: null,
  categoryId: "food",
  kind: amountCents < 0 ? "expense" : "income",
  amountCents,
  bookedOn: "2026-11-03",
  ...p,
});
const names = { food: "Spesa", salary: "Stipendio" };

describe("bookedItems", () => {
  it("groups rows by category and sign, largest first", () => {
    const items = bookedItems([row(-3000), row(-2000), row(150000, { categoryId: "salary" }), row(500)], names);
    expect(items).toEqual([
      { label: "Stipendio", source: "booked", amountCents: 150000, count: 1, overdue: false, categoryId: "salary" },
      { label: "Spesa", source: "booked", amountCents: -5000, count: 2, overdue: false, categoryId: "food" },
      { label: "Spesa", source: "booked", amountCents: 500, count: 1, overdue: false, categoryId: "food" },
    ]);
  });

  it("names the other account of booked transfers, one line per counterpart", () => {
    const t = (cents: number, to: string | null) => row(cents, { kind: "transfer", categoryId: null, counterpartAccountId: to });
    const items = bookedItems([t(-100, "b"), t(-50, "b"), t(300, "b"), t(-20, "secret")], names, { b: "Conto B" });
    expect(items.map((x) => [x.label, x.amountCents, x.counterpartId])).toEqual([
      ["Giroconto da Conto B", 300, "b"],
      ["Giroconto verso Conto B", -150, "b"],
      [TRANSFERS_LABEL, -20, "secret"],
    ]);
    expect(items.every((x) => x.transfer && x.categoryId === null)).toBe(true);
  });

  it("labels transfers and uncategorized rows, skipping zero amounts", () => {
    const items = bookedItems([row(-100, { kind: "transfer", categoryId: null }), row(-50, { categoryId: null }), row(0)], names);
    expect(items.map((x) => x.label)).toEqual([TRANSFERS_LABEL, UNCATEGORIZED_LABEL]);
  });
});

describe("withBookedMonth", () => {
  const details: ProjectionDetailMonth[] = [
    { month: "2026-11", byAccount: { a: { openingCents: 10000, closingCents: 8000, items: [{ label: "Mutuo", source: "rule", amountCents: -2000, count: 1, overdue: false }] } } },
    { month: "2026-12", byAccount: { a: { openingCents: 8000, closingCents: 7000, items: [] } } },
  ];

  it("moves the opening back to the start of the month and lists booked lines first", () => {
    const [nov, dec] = withBookedMonth(details, "2026-11", [row(-3000), row(1000, { categoryId: "salary" }), row(-999, { accountId: "other" })], names);
    expect(nov.byAccount.a.openingCents).toBe(12000);
    expect(nov.byAccount.a.closingCents).toBe(8000);
    expect(nov.byAccount.a.items.map((x) => `${x.source}:${x.label}`)).toEqual(["booked:Spesa", "booked:Stipendio", "rule:Mutuo"]);
    expect(dec).toBe(details[1]);
  });

  it("ignores rows outside the month", () => {
    const [nov] = withBookedMonth(details, "2026-11", [row(-3000, { bookedOn: "2026-10-31" })], names);
    expect(nov.byAccount.a.openingCents).toBe(10000);
  });
});
