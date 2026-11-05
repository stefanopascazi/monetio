import { describe, expect, it } from "vitest";
import { categorySpending, ceilToStep, contributionAmount, contributionBase } from "./contribution";
import { contribution, txn } from "./fixtures";

describe("ceilToStep", () => {
  it("rounds up to the step like CEILING(x, 10)", () => {
    expect(ceilToStep(14050, 1000)).toBe(15000);
    expect(ceilToStep(15000, 1000)).toBe(15000);
    expect(ceilToStep(0, 1000)).toBe(0);
    expect(ceilToStep(-500, 1000)).toBe(0);
  });
});

describe("categorySpending", () => {
  it("sums net booked expenses for the account, categories and month", () => {
    const txns = [
      txn({ accountId: "joint", categoryId: "spesa", amountCents: -20000, bookedOn: "2026-10-03" }),
      txn({ accountId: "joint", categoryId: "spesa", amountCents: -8057, bookedOn: "2026-10-20" }),
      txn({ accountId: "joint", categoryId: "spesa", amountCents: 1000, bookedOn: "2026-10-21" }),
      txn({ accountId: "joint", categoryId: "luce", amountCents: -9000, bookedOn: "2026-10-05" }),
      txn({ accountId: "ste", categoryId: "spesa", amountCents: -5000, bookedOn: "2026-10-05" }),
      txn({ accountId: "joint", categoryId: "spesa", amountCents: -7000, bookedOn: "2026-11-01" }),
      txn({ accountId: "joint", categoryId: "spesa", amountCents: -7000, bookedOn: "2026-10-30", status: "planned" }),
    ];
    expect(categorySpending(txns, "joint", ["spesa"], "2026-10")).toBe(27057);
  });
});

describe("contributionAmount", () => {
  it("adds the fixed part to half the spending rounded up to 10 euro", () => {
    // Spreadsheet: -800 + CEILING(280.57 / 2, 10) = 950
    expect(contributionAmount(contribution(), 28057)).toBe(95000);
    expect(contributionAmount(contribution({ sharePercent: 0 }), 28057)).toBe(80000);
  });
});

describe("contributionBase", () => {
  const spending = (_: unknown, month: string) => (month === "2026-10" ? 36647 : month === "2026-11" ? 17100 : 0);

  it("uses the closed previous month when the offset is -1", () => {
    const c = contribution({ spendingMonthOffset: -1 });
    expect(contributionBase(c, "2026-11", "2026-11", spending)).toEqual({ baseCents: 36647, baseMonth: "2026-10", estimated: false });
  });

  it("estimates when the referenced month is open or future", () => {
    const c = contribution({ spendingMonthOffset: -1, estimatedSpendingCents: 45000 });
    expect(contributionBase(c, "2026-12", "2026-11", spending)).toEqual({ baseCents: 45000, baseMonth: "2026-11", estimated: true });
    expect(contributionBase(contribution(), "2027-01", "2026-11", spending)).toEqual({ baseCents: 45000, baseMonth: "2027-01", estimated: true });
  });
});
