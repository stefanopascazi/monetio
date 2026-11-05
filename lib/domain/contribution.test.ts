import { describe, expect, it } from "vitest";
import { categorySpending, ceilToStep, contributionAmount } from "./contribution";
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
