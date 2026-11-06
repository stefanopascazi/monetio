import { describe, expect, it } from "vitest";
import { contribution, rule } from "./fixtures";
import { monthlyEquivalent, monthlySummary } from "./monthly-summary";

describe("monthlyEquivalent", () => {
  it("spreads non-monthly rules", () => {
    expect(monthlyEquivalent({ amountCents: -6000, frequency: "bimonthly" })).toBe(-3000);
    expect(monthlyEquivalent({ amountCents: 122500, frequency: "yearly" })).toBe(10208);
    expect(monthlyEquivalent({ amountCents: -1200, frequency: "weekly" })).toBe(-5200);
  });
});

describe("monthlySummary", () => {
  it("combines rules and quotas per account", () => {
    const rules = [
      rule({ accountId: "joint", amountCents: -78110 }),
      rule({ id: "s", accountId: "ste", amountCents: 220000 }),
      rule({ id: "t", kind: "transfer", accountId: "ste", counterpartAccountId: "joint", amountCents: -80000 }),
    ];
    const res = monthlySummary(["ste", "joint"], rules, [contribution({ fromAccountId: "ste", toAccountId: "joint", fixedCents: 0, estimatedSpendingCents: 45000 })], "2026-11-05");
    expect(res.ste).toEqual({ rulesIncomeCents: 220000, rulesExpenseCents: 0, transfersCents: -102500, netCents: 117500 });
    expect(res.joint.netCents).toBe(-78110 + 102500);
  });

  it("skips inactive and ended rules", () => {
    const rules = [rule({ accountId: "ste", amountCents: -100, active: false }), rule({ id: "e", accountId: "ste", amountCents: -100, endDate: "2026-10-31" })];
    expect(monthlySummary(["ste"], rules, [], "2026-11-05").ste.netCents).toBe(0);
  });
});
