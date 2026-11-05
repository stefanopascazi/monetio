import { describe, expect, it } from "vitest";
import { coveredCategories, type FlowLike, monthlyEquivalent, monthlySummary, variableBaseline } from "./baseline";
import { contribution, rule } from "./fixtures";

const f = (p: Partial<FlowLike> & Pick<FlowLike, "totalCents">): FlowLike => ({
  accountId: "ste",
  month: "2026-09",
  categoryId: "varie",
  kind: p.totalCents < 0 ? "expense" : "income",
  ...p,
});

describe("variableBaseline", () => {
  const flows = [
    f({ categoryId: "stip", totalCents: 220000 }),
    f({ categoryId: "stip", totalCents: 230000, month: "2026-10" }),
    f({ totalCents: -30000 }),
    f({ totalCents: -50000, month: "2026-10" }),
    f({ categoryId: "mutuo", totalCents: -78110 }),
    f({ kind: "transfer", categoryId: null, totalCents: -80000 }),
    f({ kind: "adjustment", categoryId: null, totalCents: -999 }),
    f({ totalCents: -1, month: "2026-05" }),
  ];

  it("averages uncovered income and spending over the months", () => {
    const res = variableBaseline(flows, ["2026-09", "2026-10"], coveredCategories([rule({ accountId: "ste", categoryId: "mutuo", amountCents: -78110 })]));
    expect(res.ste).toEqual({
      incomeCents: 225000,
      expenseCents: 40000,
      categories: [
        { categoryId: "stip", avgCents: 225000 },
        { categoryId: "varie", avgCents: -40000 },
      ],
    });
  });

  it("drops categories covered by a rule (e.g. a salary rule)", () => {
    const res = variableBaseline(flows, ["2026-09", "2026-10"], coveredCategories([rule({ accountId: "ste", categoryId: "stip", amountCents: 1 })]));
    expect(res.ste.incomeCents).toBe(0);
  });

  it("lets an estimate cover its category on every account", () => {
    const estimate = rule({ accountId: "card", categoryId: "varie", amountCents: -45000, schedule: "estimate" });
    const res = variableBaseline(flows, ["2026-09", "2026-10"], coveredCategories([estimate]));
    expect(res.ste.categories.some((c) => c.categoryId === "varie")).toBe(false);
    // A regular rule on another account does not hide this account's history.
    const other = variableBaseline(flows, ["2026-09", "2026-10"], coveredCategories([rule({ accountId: "asha", categoryId: "stip", amountCents: 1 })]));
    expect(other.ste.incomeCents).toBe(225000);
  });

  it("ignores inactive rules and empty ranges", () => {
    expect(coveredCategories([rule({ categoryId: "x", amountCents: -1, active: false })]).size).toBe(0);
    expect(variableBaseline(flows, [], new Map())).toEqual({});
  });
});

describe("monthlyEquivalent", () => {
  it("spreads non-monthly rules", () => {
    expect(monthlyEquivalent({ amountCents: -6000, frequency: "bimonthly" })).toBe(-3000);
    expect(monthlyEquivalent({ amountCents: 122500, frequency: "yearly" })).toBe(10208);
    expect(monthlyEquivalent({ amountCents: -1200, frequency: "weekly" })).toBe(-5200);
  });
});

describe("monthlySummary", () => {
  it("combines rules, quotas and averages per account", () => {
    const rules = [
      rule({ accountId: "joint", amountCents: -78110 }),
      rule({ id: "t", kind: "transfer", accountId: "ste", counterpartAccountId: "joint", amountCents: -80000 }),
    ];
    const res = monthlySummary(["ste", "joint"], rules, [contribution({ fromAccountId: "ste", toAccountId: "joint", fixedCents: 0, estimatedSpendingCents: 45000 })], {
      ste: { incomeCents: 225000, expenseCents: 40000, categories: [] },
    });
    expect(res.ste).toEqual({ rulesIncomeCents: 0, rulesExpenseCents: 0, transfersCents: -102500, variableIncomeCents: 225000, variableExpenseCents: 40000, netCents: 82500 });
    expect(res.joint.netCents).toBe(-78110 + 102500);
  });
});
