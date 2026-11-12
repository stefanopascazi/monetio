import { describe, expect, it } from "vitest";
import { estimatePool, isDecreasing, occurrenceOfPeriod } from "./estimates";
import { rule } from "./fixtures";

describe("estimatePool", () => {
  const psicologa = rule({ accountId: "asha", amountCents: -6500, schedule: "estimate", decrementCategoryIds: ["salute", "terapia"] });
  let n = 0;
  const mv = (accountId: string, categoryId: string, amountCents: number, bookedOn = "2026-11-05", description = categoryId) => ({ id: `t${++n}`, accountId, categoryId, amountCents, description, bookedOn });

  it("draws spending from every chosen category up to the estimate", () => {
    const draw = estimatePool([mv("asha", "salute", -1700), mv("asha", "terapia", -6000), mv("joint", "salute", -9000)]);
    expect(draw(psicologa, 6500).takenCents).toBe(6500);
    // The pool is consumed: what is left of "terapia" is 1200.
    expect(draw(psicologa, 6500).takenCents).toBe(1200);
  });

  it("offsets refunds and ignores other accounts", () => {
    const draw = estimatePool([mv("asha", "salute", -3000), mv("asha", "salute", 1000), mv("joint", "terapia", -5000)]);
    expect(draw(psicologa, 6500).takenCents).toBe(2000);
  });

  it("reduces income estimates by money received", () => {
    const extra = rule({ accountId: "asha", amountCents: 20000, schedule: "estimate", decrementCategoryIds: ["bonus"] });
    const draw = estimatePool([mv("asha", "bonus", 5000)]);
    expect(draw(extra, 20000).takenCents).toBe(5000);
  });

  it("names the movements consumed, oldest first, with refunds and split shares", () => {
    const draw = estimatePool([
      mv("asha", "terapia", -4000, "2026-11-09", "Seduta"),
      mv("asha", "salute", -3000, "2026-11-03", "Farmacia"),
      mv("asha", "salute", 500, "2026-11-04", "Rimborso"),
    ]);
    const first = draw(psicologa, 6500);
    expect(first.parts.map((p) => [p.description, p.bookedOn, p.amountCents])).toEqual([
      ["Farmacia", "2026-11-03", -3000],
      ["Rimborso", "2026-11-04", 500],
      ["Seduta", "2026-11-09", -4000],
    ]);
    // The parts net what was taken.
    expect(first.parts.reduce((s, p) => s + p.amountCents, 0)).toBe(-first.takenCents);
    expect(draw(psicologa, 6500)).toEqual({ takenCents: 0, parts: [] });
  });

  it("splits a movement between two estimates sharing a category", () => {
    const draw = estimatePool([mv("asha", "terapia", -8000, "2026-11-02", "Seduta")]);
    expect(draw(psicologa, 6500).parts.map((p) => p.amountCents)).toEqual([-6500]);
    expect(draw(psicologa, 6500).parts.map((p) => [p.description, p.amountCents])).toEqual([["Seduta", -1500]]);
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
