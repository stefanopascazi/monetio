import { describe, expect, it } from "vitest";
import { estimatePool, isDecreasing, occurrenceOfPeriod } from "./estimates";
import { rule } from "./fixtures";

describe("estimatePool", () => {
  const psicologa = rule({ accountId: "asha", amountCents: -6500, schedule: "estimate", decrementCategoryIds: ["salute", "terapia"] });

  it("draws spending from every chosen category up to the estimate", () => {
    const draw = estimatePool([
      { accountId: "asha", categoryId: "salute", amountCents: -1700 },
      { accountId: "asha", categoryId: "terapia", amountCents: -6000 },
      { accountId: "joint", categoryId: "salute", amountCents: -9000 },
    ]);
    expect(draw(psicologa, 6500)).toBe(6500);
    // The pool is consumed: what is left of "terapia" is 1200.
    expect(draw(psicologa, 6500)).toBe(1200);
  });

  it("offsets refunds and ignores other accounts", () => {
    const draw = estimatePool([
      { accountId: "asha", categoryId: "salute", amountCents: -3000 },
      { accountId: "asha", categoryId: "salute", amountCents: 1000 },
      { accountId: "joint", categoryId: "terapia", amountCents: -5000 },
    ]);
    expect(draw(psicologa, 6500)).toBe(2000);
  });

  it("reduces income estimates by money received", () => {
    const extra = rule({ accountId: "asha", amountCents: 20000, schedule: "estimate", decrementCategoryIds: ["bonus"] });
    const draw = estimatePool([{ accountId: "asha", categoryId: "bonus", amountCents: 5000 }]);
    expect(draw(extra, 20000)).toBe(5000);
  });

  it("tells decreasing estimates apart", () => {
    expect(isDecreasing(psicologa)).toBe(true);
    expect(isDecreasing({ ...psicologa, decrementCategoryIds: [] })).toBe(false);
    expect(isDecreasing({ ...psicologa, schedule: "due" })).toBe(false);
  });
});

describe("occurrenceOfPeriod", () => {
  it("finds the scheduled date of a month or week", () => {
    expect(occurrenceOfPeriod(rule({ amountCents: -1, dayOfMonth: 15 }), "2026-11")).toBe("2026-11-15");
    expect(occurrenceOfPeriod(rule({ amountCents: -1, frequency: "weekly", startDate: "2026-11-02" }), "2026-11-09")).toBe("2026-11-09");
    expect(occurrenceOfPeriod(rule({ amountCents: -1, frequency: "weekly", startDate: "2026-11-02" }), "2026-11-10")).toBeNull();
    expect(occurrenceOfPeriod(rule({ amountCents: -1, endDate: "2026-10-31" }), "2026-11")).toBeNull();
  });
});
