import { describe, expect, it } from "vitest";
import { rule } from "./fixtures";
import type { ProjectionInput } from "./projection";
import { projectBalances } from "./projection";
import { projectionDetails } from "./projection-details";

const base: ProjectionInput = {
  today: "2026-11-05",
  months: 2,
  balances: { joint: 100000, ste: 50000 },
  rules: [],
  contributions: [],
  booked: new Set(),
  contributionSpending: () => 0,
  categorySpent: () => 0,
  planned: [],
  lookbackDays: 30,
};

describe("projectionDetails", () => {
  const mutuo = rule({ id: "m", accountId: "joint", description: "Rata mutuo", amountCents: -78110, dayOfMonth: 15, startDate: "2026-11-01" });
  const quota = rule({ id: "q", kind: "transfer", accountId: "asha", counterpartAccountId: "joint", description: "Quota fissa Asha", amountCents: -80000, dayOfMonth: 10, startDate: "2026-11-01" });

  it("lists money in and out per month with opening and closing balances", () => {
    const input = { ...base, rules: [mutuo, quota] };
    const [nov, dec] = projectionDetails(input, ["joint"]);
    expect(nov.byAccount.joint).toEqual({
      openingCents: 100000,
      closingCents: 101890,
      items: [
        { label: "Quota fissa Asha", source: "rule", amountCents: 80000, count: 1, overdue: false },
        { label: "Rata mutuo", source: "rule", amountCents: -78110, count: 1, overdue: false },
      ],
    });
    expect(dec.byAccount.joint.openingCents).toBe(101890);
    // Closing balances match the projection.
    expect(dec.byAccount.joint.closingCents).toBe(projectBalances(input)[1].byAccount.joint);
  });

  it("keeps hidden accounts out", () => {
    const [nov] = projectionDetails({ ...base, months: 1, rules: [quota] }, ["joint"]);
    expect(Object.keys(nov.byAccount)).toEqual(["joint"]);
    expect(nov.byAccount.joint.items.map((x) => x.label)).toEqual(["Quota fissa Asha"]);
  });

  it("keeps unpaid past occurrences on a separate overdue line", () => {
    const luce = rule({ id: "l", accountId: "joint", description: "Bolletta luce", amountCents: -10000, schedule: "due", dayOfMonth: 20, startDate: "2026-10-01" });
    const [nov] = projectionDetails({ ...base, months: 1, rules: [luce] }, ["joint"]);
    expect(nov.byAccount.joint.items).toEqual([
      { label: "Bolletta luce", source: "rule", amountCents: -10000, count: 1, overdue: true },
      { label: "Bolletta luce", source: "rule", amountCents: -10000, count: 1, overdue: false },
    ]);
  });

  it("stops at maxMonths", () => {
    expect(projectionDetails({ ...base, months: 12 }, ["joint"], 3)).toHaveLength(3);
  });
});
