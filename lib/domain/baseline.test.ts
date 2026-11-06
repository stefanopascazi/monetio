import { describe, expect, it } from "vitest";
import { type FlowLike, monthlyEquivalent, monthlySummary, prudentAverage, residualAfterRules, ruleCoverage, variableBaseline } from "./baseline";
import { contribution, rule } from "./fixtures";

const f = (p: Partial<FlowLike> & Pick<FlowLike, "totalCents">): FlowLike => ({
  accountId: "ste",
  month: "2026-09",
  categoryId: "varie",
  kind: p.totalCents < 0 ? "expense" : "income",
  ...p,
});

describe("variableBaseline", () => {
  const months = ["2026-09", "2026-10"];
  const flows = [
    f({ categoryId: "stip", totalCents: 220000 }),
    f({ categoryId: "stip", totalCents: 230000, month: "2026-10" }),
    f({ totalCents: -30000 }),
    f({ totalCents: -50000, month: "2026-10" }),
    f({ categoryId: "mutuo", totalCents: -78110 }),
    f({ categoryId: "mutuo", totalCents: -78110, month: "2026-10" }),
    f({ kind: "transfer", categoryId: null, totalCents: -80000 }),
    f({ kind: "adjustment", categoryId: null, totalCents: -999 }),
    f({ totalCents: -1, month: "2026-05" }),
  ];
  const cover = (rules: Parameters<typeof ruleCoverage>[0]) => ruleCoverage(rules, "2026-11-05");

  it("averages income and spending not projected by rules", () => {
    const res = variableBaseline(flows, months, cover([rule({ accountId: "ste", categoryId: "mutuo", amountCents: -78110 })]));
    expect(res.ste).toEqual({
      incomeCents: 225000,
      expenseCents: 40000,
      categories: [
        { categoryId: "stip", avgCents: 225000 },
        { categoryId: "varie", avgCents: -40000 },
      ],
    });
  });

  it("subtracts only the rule amount from its category", () => {
    // A yearly insurance in "varie" must not hide the rest of that spending.
    const insurance = rule({ accountId: "ste", categoryId: "varie", amountCents: -24000, frequency: "yearly" });
    expect(variableBaseline(flows, months, cover([insurance])).ste.categories.find((c) => c.categoryId === "varie")?.avgCents).toBe(-38000);
    // A rule larger than history (or of opposite sign) zeroes the category.
    expect(variableBaseline(flows, months, cover([rule({ accountId: "ste", categoryId: "stip", amountCents: 300000 })])).ste.incomeCents).toBe(0);
    expect(variableBaseline(flows, months, cover([rule({ accountId: "ste", categoryId: "stip", amountCents: -1 })])).ste.incomeCents).toBe(0);
  });

  it("lets a spending estimate replace its category on every account", () => {
    const res = variableBaseline(flows, months, cover([rule({ accountId: "card", categoryId: "varie", amountCents: -10000, schedule: "estimate" })]));
    expect(res.ste.categories.some((c) => c.categoryId === "varie")).toBe(false);
    // A regular rule on another account does not touch this account's history.
    expect(variableBaseline(flows, months, cover([rule({ accountId: "asha", categoryId: "stip", amountCents: 1 })])).ste.incomeCents).toBe(225000);
  });

  it("keeps transfer estimates on their own account", () => {
    const extra = rule({ kind: "transfer", accountId: "card", counterpartAccountId: "ste", categoryId: "varie", amountCents: -60000, schedule: "estimate" });
    expect(variableBaseline(flows, months, cover([extra])).ste.categories.find((c) => c.categoryId === "varie")?.avgCents).toBe(-40000);
  });

  it("does not let one-off income inflate the average", () => {
    const res = variableBaseline([f({ categoryId: "extra", totalCents: 1000000, month: "2026-10" }), f({ categoryId: "extra", totalCents: -20000 }), f({ categoryId: "extra", totalCents: -20000, month: "2026-10" })], months);
    // Mean +480, median +480 with 2 months: use 3 months to see the median kick in.
    expect(res.ste.incomeCents).toBe(480000);
    const three = variableBaseline(
      [f({ categoryId: "extra", totalCents: 1000000, month: "2026-10" }), f({ categoryId: "extra", totalCents: -20000 }), f({ categoryId: "extra", totalCents: -20000, month: "2026-08" })],
      ["2026-08", "2026-09", "2026-10"],
    );
    expect(three.ste).toMatchObject({ incomeCents: 0, expenseCents: 20000 });
  });

  it("ignores inactive or ended rules and empty ranges", () => {
    const c = cover([rule({ categoryId: "x", amountCents: -1, active: false }), rule({ categoryId: "y", amountCents: -1, endDate: "2026-10-31" })]);
    expect([c.byAccount.size, c.shared.size]).toEqual([0, 0]);
    expect(variableBaseline(flows, [])).toEqual({});
  });
});

describe("prudentAverage", () => {
  it("uses the mean for spending and the lower of mean and median for income", () => {
    expect(prudentAverage([-100, -300])).toBe(-200);
    expect(prudentAverage([0, 0, 900])).toBe(0);
    expect(prudentAverage([100, 120, 110])).toBe(110);
    expect(prudentAverage([])).toBe(0);
  });
});

describe("residualAfterRules", () => {
  it("subtracts same-sign coverage and drops opposite-sign history", () => {
    expect(residualAfterRules(-50000, -2050)).toBe(-47950);
    expect(residualAfterRules(-3000, -7000)).toBe(0);
    expect(residualAfterRules(1500, -7000)).toBe(0);
    expect(residualAfterRules(-3000, undefined)).toBe(-3000);
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
