import { describe, expect, it } from "vitest";
import type { Category } from "../domain/types";
import { donutMonth, monthOverMonth, percentChange } from "./dashboard";
import type { MonthlyFlow } from "./flows";

const point = (month: string, incomeCents: number, expenseCents: number) => ({ month, label: month, incomeCents, expenseCents });

describe("percentChange", () => {
  it("compares with the base and skips a zero base", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(10, 0)).toBeUndefined();
  });
});

describe("monthOverMonth", () => {
  it("uses the last two months", () => {
    expect(monthOverMonth([point("2026-09", 1, 1), point("2026-10", 200, 100), point("2026-11", 300, 50)])).toEqual({
      incomeCents: 300,
      expenseCents: 50,
      incomeDelta: 50,
      expenseDelta: -50,
    });
  });

  it("handles short series", () => {
    expect(monthOverMonth([])).toEqual({ incomeCents: 0, expenseCents: 0, incomeDelta: undefined, expenseDelta: undefined });
    expect(monthOverMonth([point("2026-11", 300, 50)]).incomeDelta).toBeUndefined();
  });
});

describe("donutMonth", () => {
  const categories = [{ id: "spesa", name: "Spesa" }] as Category[];
  const flow = (month: string, totalCents: number): MonthlyFlow => ({ accountId: "a", month, categoryId: "spesa", kind: "expense", counterpartAccountId: null, totalCents });

  it("keeps the current month when it has spending", () => {
    expect(donutMonth([flow("2026-11", -500)], "2026-11", categories)).toBe("2026-11");
  });

  it("falls back to the previous month", () => {
    expect(donutMonth([flow("2026-10", -500)], "2026-11", categories)).toBe("2026-10");
    expect(donutMonth([], "2026-01", categories)).toBe("2025-12");
  });
});
