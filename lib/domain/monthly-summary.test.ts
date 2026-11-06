import { describe, expect, it } from "vitest";
import { contribution, rule } from "./fixtures";
import { monthlySummary, summaryWindow } from "./monthly-summary";

const today = "2026-11-05";

describe("summaryWindow", () => {
  it("covers the 12 months after the current one", () => {
    expect(summaryWindow(today)).toEqual({ from: "2026-12-01", to: "2027-11-30" });
  });
});

describe("monthlySummary", () => {
  it("combines rules and quotas per account", () => {
    const rules = [
      rule({ accountId: "joint", amountCents: -78110 }),
      rule({ id: "s", accountId: "ste", amountCents: 220000 }),
      rule({ id: "t", kind: "transfer", accountId: "ste", counterpartAccountId: "joint", amountCents: -80000 }),
    ];
    const res = monthlySummary(["ste", "joint"], rules, [contribution({ fromAccountId: "ste", toAccountId: "joint", fixedCents: 0, estimatedSpendingCents: 45000, startDate: "2026-01-01" })], today);
    expect(res.ste).toEqual({ rulesIncomeCents: 220000, rulesExpenseCents: 0, transfersCents: -102500, netCents: 117500 });
    expect(res.joint.netCents).toBe(-78110 + 102500);
  });

  it("spreads non-monthly rules over the year", () => {
    const rules = [rule({ accountId: "ste", amountCents: -24000, frequency: "yearly", startDate: "2026-03-01" }), rule({ id: "b", accountId: "ste", amountCents: -6000, frequency: "bimonthly" })];
    expect(monthlySummary(["ste"], rules, [], today).ste.rulesExpenseCents).toBe(2000 + 3000);
  });

  it("weighs rules only inside their dates", () => {
    // Salary raise from February: 2 months at 1.770 and 10 at 1.900, never both.
    const salaries = [
      rule({ id: "old", accountId: "asha", amountCents: 177000, startDate: "2026-11-01", endDate: "2027-01-31" }),
      rule({ id: "new", accountId: "asha", amountCents: 190000, startDate: "2027-02-01" }),
    ];
    expect(monthlySummary(["asha"], salaries, [], today).asha.rulesIncomeCents).toBe(Math.round((2 * 177000 + 10 * 190000) / 12));
    // Inactive and ended rules count nothing.
    const off = [rule({ accountId: "ste", amountCents: -100, active: false }), rule({ id: "e", accountId: "ste", amountCents: -100, endDate: "2026-10-31" })];
    expect(monthlySummary(["ste"], off, [], today).ste.netCents).toBe(0);
  });
});
