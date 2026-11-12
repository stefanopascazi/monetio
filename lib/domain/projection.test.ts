import { describe, expect, it } from "vitest";
import { contribution, rule, txn } from "./fixtures";
import { type ProjectionInput, projectBalances, projectedMovements } from "./projection";
import { overrideMap, ruleKey } from "./schedule";

const base: ProjectionInput = {
  today: "2026-11-05",
  months: 3,
  balances: { joint: 100000, ste: 50000 },
  rules: [],
  contributions: [],
  booked: new Set(),
  contributionSpending: () => 0,
  estimateUsed: () => 0,
  planned: [],
  lookbackDays: 30,
};

describe("projectBalances", () => {
  it("applies monthly rules after today and skips booked ones", () => {
    const mutuo = rule({ id: "m", accountId: "joint", amountCents: -78110, dayOfMonth: 1, startDate: "2026-01-01" });
    const res = projectBalances({ ...base, rules: [mutuo], booked: new Set([ruleKey("m", "2026-11-01")]) });
    expect(res.map((p) => [p.month, p.byAccount.joint])).toEqual([
      ["2026-11", 100000],
      ["2026-12", 21890],
      ["2027-01", -56220],
    ]);
  });

  it("adds the bonifico fee of each unbooked occurrence", () => {
    const affitto = rule({ id: "a", accountId: "joint", amountCents: -80000, dayOfMonth: 10, startDate: "2026-01-01", paymentMethod: "bank_transfer", feeCents: 65 });
    const res = projectBalances({ ...base, months: 1, rules: [affitto] });
    // Overdue October occurrence plus November's, each with its fee.
    expect(res.map((p) => p.byAccount.joint)).toEqual([100000 - 2 * 80065]);
  });

  it("charges a transfer fee to the paying account", () => {
    const g = rule({ id: "g", kind: "transfer", accountId: "ste", counterpartAccountId: "joint", amountCents: -10000, dayOfMonth: 20, startDate: "2026-11-01", feeCents: 100 });
    const [p] = projectBalances({ ...base, months: 1, rules: [g] });
    expect(p.byAccount).toMatchObject({ ste: 50000 - 10100, joint: 110000 });
  });

  it("never overlaps a rule that ends with the one that replaces it", () => {
    const old = rule({ id: "o", accountId: "ste", amountCents: 177000, dayOfMonth: 10, startDate: "2026-11-01", endDate: "2027-01-31" });
    const next = rule({ id: "n", accountId: "ste", amountCents: 190000, dayOfMonth: 10, startDate: "2027-02-01" });
    const res = projectBalances({ ...base, months: 5, rules: [old, next] });
    const deltas = res.map((p, i) => p.byAccount.ste - (i ? res[i - 1].byAccount.ste : 50000));
    expect(deltas).toEqual([177000, 177000, 177000, 190000, 190000]);
  });

  it("moves transfers between accounts and keeps the total", () => {
    const giro = rule({ id: "g", kind: "transfer", accountId: "ste", counterpartAccountId: "joint", amountCents: -26950, dayOfMonth: 27, startDate: "2026-11-01" });
    const res = projectBalances({ ...base, months: 1, rules: [giro] });
    expect(res[0].byAccount).toEqual({ joint: 126950, ste: 23050 });
    expect(res[0].totalCents).toBe(150000);
  });

  it("credits the counterpart of a transfer from an account missing from balances", () => {
    // Quota from a private account the viewer cannot see: only the joint side matters.
    const quota = rule({ id: "q", kind: "transfer", accountId: "asha", counterpartAccountId: "joint", amountCents: -80000, dayOfMonth: 27, startDate: "2026-11-01" });
    const res = projectBalances({ ...base, months: 1, balances: { joint: 100000 }, rules: [quota] });
    expect(res[0].byAccount.joint).toBe(180000);
  });

  it("counts estimates in full even with spending already booked in their category", () => {
    const psicologa = rule({ id: "p", accountId: "joint", categoryId: "salute", amountCents: -6500, schedule: "estimate", dayOfMonth: 15 });
    const res = projectBalances({ ...base, months: 2, rules: [psicologa], estimateUsed: () => 1700 });
    expect(res.map((p) => p.byAccount.joint)).toEqual([93500, 87000]);
  });

  it("reduces a decreasing estimate by its categories this month only", () => {
    const psicologa = rule({ id: "p", accountId: "joint", categoryId: "salute", amountCents: -6500, schedule: "estimate", dayOfMonth: 15, decrementCategoryIds: ["salute"] });
    const estimateMovements = [{ id: "t1", accountId: "joint", categoryId: "salute", amountCents: -1700, description: "Farmacia", bookedOn: "2026-11-03" }];
    const res = projectBalances({ ...base, months: 2, rules: [psicologa], estimateMovements });
    // November: 65 - 17; December starts again from the full 65, nothing carried over.
    expect(res.map((p) => p.byAccount.joint)).toEqual([95200, 88700]);
    const [nov, dec] = projectedMovements({ ...base, months: 2, rules: [psicologa], estimateMovements });
    expect(nov.usage).toEqual({ totalCents: 6500, usedCents: 1700, overCents: 0, parts: [{ id: "t1", description: "Farmacia", bookedOn: "2026-11-03", amountCents: -1700, movementCents: -1700 }] });
    expect(dec.usage).toBeUndefined();
  });

  it("keeps a used-up decreasing estimate at zero with what consumed it", () => {
    const psicologa = rule({ id: "p", accountId: "joint", amountCents: -6500, schedule: "estimate", dayOfMonth: 15, decrementCategoryIds: ["salute"] });
    const estimateMovements = [{ id: "t1", accountId: "joint", categoryId: "salute", amountCents: -8000, description: "Visita", bookedOn: "2026-11-03" }];
    const [nov] = projectedMovements({ ...base, months: 1, rules: [psicologa], estimateMovements });
    expect(nov).toMatchObject({ amountCents: 0, source: "estimate", usage: { totalCents: 6500, usedCents: 6500 } });
    expect(projectBalances({ ...base, months: 1, rules: [psicologa], estimateMovements })[0].byAccount.joint).toBe(100000);
  });

  it("reports what went beyond a decreasing estimate once every estimate took its share", () => {
    const visite = rule({ id: "v", accountId: "joint", amountCents: -6500, schedule: "estimate", dayOfMonth: 15, decrementCategoryIds: ["salute"] });
    const farmacia = rule({ id: "f", accountId: "joint", amountCents: -1000, schedule: "estimate", dayOfMonth: 15, decrementCategoryIds: ["salute"] });
    const estimateMovements = [{ id: "t1", accountId: "joint", categoryId: "salute", amountCents: -8000, description: "Visita", bookedOn: "2026-11-03" }];
    const [v, f] = projectedMovements({ ...base, months: 1, rules: [visite, farmacia], estimateMovements });
    // 80 booked: 65 to the first estimate, 10 to the second, 5 beyond.
    expect(v.usage).toMatchObject({ usedCents: 6500, overCents: 500, parts: [{ id: "t1", amountCents: -7000 }] });
    expect(f.usage).toMatchObject({ usedCents: 1000, overCents: 0 });
  });

  it("never marks an estimate overdue: an earlier day of the month moves it to today", () => {
    const spese = rule({ id: "m", accountId: "joint", amountCents: -28000, schedule: "estimate", dayOfMonth: 1, startDate: "2026-11-01" });
    const bill = rule({ id: "b", accountId: "joint", amountCents: -5000, schedule: "due", dayOfMonth: 2, startDate: "2026-11-01" });
    const [estimate, late] = projectedMovements({ ...base, months: 1, rules: [spese, bill] });
    expect(estimate).toMatchObject({ date: "2026-11-05", overdue: false, source: "estimate" });
    expect(late).toMatchObject({ date: "2026-11-05", overdue: true, source: "rule" });
  });

  it("drops estimate occurrences booked or closed from the recap", () => {
    const spesa = rule({ id: "s", accountId: "joint", amountCents: -10000, schedule: "estimate", dayOfMonth: 28 });
    const closed = overrideMap([{ ruleId: "s", period: "2026-12", amountCents: 0, dueDate: "2026-12-28", note: null }]);
    const res = projectBalances({ ...base, months: 3, rules: [spesa], booked: new Set([ruleKey("s", "2026-11-28")]), overrides: closed });
    expect(res.map((p) => p.byAccount.joint)).toEqual([100000, 100000, 90000]);
  });

  it("treats last month's statement as covering a card's current estimate", () => {
    const spesa = rule({ id: "s", accountId: "card", categoryId: "spesa", amountCents: -45000, schedule: "estimate", dayOfMonth: 28 });
    const spent = (_: unknown, month: string) => (month === "2026-10" ? 34200 : 0);
    const input = { ...base, months: 2, balances: { card: 0 }, rules: [spesa], estimateUsed: spent };
    expect(projectBalances({ ...input, cardAccountIds: new Set(["card"]) }).map((p) => p.byAccount.card)).toEqual([0, -45000]);
    // Not a card: last month's spending does not cover this month.
    expect(projectBalances(input).map((p) => p.byAccount.card)).toEqual([-45000, -90000]);
  });

  it("adds contributions with the larger of actual and estimated spending", () => {
    const c = contribution({ fromAccountId: "ste", toAccountId: "joint", estimatedSpendingCents: 45000, startDate: "2026-11-01" });
    const res = projectBalances({ ...base, months: 2, contributions: [c], contributionSpending: () => 50000 });
    // Nov: 800 + 250 = 1050; Dec: 800 + 450 / 2 = 1025.
    expect(res.map((p) => p.byAccount.ste)).toEqual([50000 - 105000, 50000 - 105000 - 102500]);
    expect(res[1].totalCents).toBe(150000);
  });

  it("counts overdue unpaid deadlines and planned transactions", () => {
    const luce = rule({ id: "l", accountId: "joint", amountCents: -10000, schedule: "due", dayOfMonth: 20, startDate: "2026-10-01", endDate: "2026-10-31" });
    const planned = [txn({ accountId: "joint", amountCents: -5000, bookedOn: "2026-12-10", status: "planned" })];
    const res = projectBalances({ ...base, months: 2, rules: [luce], planned });
    expect(res.map((p) => p.byAccount.joint)).toEqual([90000, 85000]);
  });

  it("uses actual amounts entered for an occurrence", () => {
    const luce = rule({ id: "l", accountId: "joint", amountCents: -10000, schedule: "due", dayOfMonth: 15, startDate: "2026-11-01", endDate: "2026-11-30" });
    const overrides = overrideMap([{ ruleId: "l", period: "2026-11", amountCents: -8740, dueDate: "2026-12-02", note: null }]);
    const res = projectBalances({ ...base, months: 2, rules: [luce], overrides });
    expect(res.map((p) => p.byAccount.joint)).toEqual([100000, 91260]);
  });

});
