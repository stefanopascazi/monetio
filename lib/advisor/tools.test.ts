import { describe, expect, it } from "vitest";
import { advisorContext } from "./fixtures";
import { ADVISOR_TOOLS, runAdvisorTool } from "./tools";

const ctx = advisorContext();
const run = (name: string, input: unknown) => {
  const out = runAdvisorTool(name, input, ctx);
  return { ...out, json: out.isError ? null : JSON.parse(out.content) };
};
const goal = (p: Record<string, unknown> = {}) => ({
  label: "Vacanza",
  amount_euros: 4500,
  date: "2027-01-05",
  account_id: "joint",
  cut_category_ids: ["food"],
  scope_account_ids: [],
  floor_euros: 0,
  ...p,
});

describe("ADVISOR_TOOLS", () => {
  it("declares strict schemas that require every property", () => {
    for (const t of ADVISOR_TOOLS) {
      const schema = t.input_schema as unknown as { properties: Record<string, unknown>; required: string[]; additionalProperties: boolean };
      expect(t.strict).toBe(true);
      expect(schema.additionalProperties).toBe(false);
      expect([...schema.required].sort()).toEqual(Object.keys(schema.properties).sort());
    }
  });
});

describe("runAdvisorTool", () => {
  it("describes the household in euros with spending accounts and expense categories", () => {
    const { json } = run("get_household_overview", {});
    expect(json.today).toBe("2026-11-05");
    expect(json.accounts).toContainEqual({ id: "joint", name: "Conto comune", type: "checking", balance_euros: 3000 });
    expect(json.spending_account_ids).toEqual(["joint"]);
    expect(json.reliability.level).toBe("high");
    expect(json.expected_monthly_by_category).toEqual([
      { category_id: "home", name: "Mutuo", monthly_euros: 1000 },
      { category_id: "food", name: "Ristoranti", monthly_euros: 600 },
    ]);
    // 3 months of the joint account's average spending.
    expect(json).toMatchObject({ avg_monthly_spending_euros: 1600, emergency_reserve_euros: 4800 });
  });

  it("projects the spending accounts by default", () => {
    const { json } = run("get_projection", { months: 3, scope_account_ids: [] });
    expect(json.scope_account_ids).toEqual(["joint"]);
    expect(json.month_ends.map((m: { total_euros: number }) => m.total_euros)).toEqual([3400, 3800, 4200]);
  });

  it("returns the engine verdict with levers in euros", () => {
    const out = run("assess_goal", goal());
    expect(out.json).toMatchObject({
      outcome: "yes_if",
      shortfall_euros: 300,
      levers: [
        { kind: "postpone", date: "2027-02-05" },
        { kind: "reduce", max_amount_euros: 4200 },
        { kind: "save", extra_monthly_savings_euros: 100 },
        { kind: "cut", categoryId: "food", percent: 17 },
      ],
    });
    expect(out.verdict).toMatchObject({ outcome: "yes_if", goal: { amountCents: 450000, accountId: "joint" }, shortfallCents: 30000 });
  });

  it("flags a yes inside the projection uncertainty as tight", () => {
    // Uncertainty in January: 10% of 1.600 € x sqrt(3) ≈ 277 €; 4.000 € leaves 200 €.
    expect(run("assess_goal", goal({ amount_euros: 1000 })).json).toMatchObject({ outcome: "yes", tight: false });
    expect(run("assess_goal", goal({ amount_euros: 4000 })).json).toMatchObject({ outcome: "yes", tight: true });
  });

  it.each([
    ["an unknown account", { account_id: "nope" }, "account_id: unknown account"],
    ["a past date", { date: "2026-10-01" }, "date: must not be in the past"],
    ["a malformed date", { date: "agosto" }, "date: expected YYYY-MM-DD"],
    ["a zero amount", { amount_euros: 0 }, "amount_euros: invalid amount"],
    ["an unknown category", { cut_category_ids: ["x"] }, "cut_category_ids[0]: unknown expense category"],
  ])("rejects %s so the model can correct it", (_label, patch, message) => {
    expect(runAdvisorTool("assess_goal", goal(patch), ctx)).toEqual({ content: message, isError: true });
  });

  it("simulates a saving plan towards savings against the current projection", () => {
    const { json } = run("simulate_scenario", {
      one_off_expenses: [],
      category_cuts: [{ category_id: "food", percent: 50, from_date: "" }],
      saving_plans: [
        { label: "Vacanza", monthly_euros: 200, from_account_id: "joint", to_account_id: "savings", day_of_month: 27, start_date: "2026-11-01", end_date: "" },
      ],
      months: 2,
      scope_account_ids: ["joint"],
      floor_euros: 0,
    });
    // +300 € from the cut, -200 € set aside each month.
    expect(json.month_ends).toEqual([
      { month: "2026-11", total_euros: 3500, current_euros: 3400 },
      { month: "2026-12", total_euros: 4000, current_euros: 3800 },
    ]);
    expect(json.feasible).toBe(true);
  });

  it("lists the affordable amount per date and extra monthly saving", () => {
    const { json } = run("affordable_amounts", { dates: ["2027-01-05"], account_id: "joint", extra_monthly_savings_euros: [0, 100], scope_account_ids: ["joint"], floor_euros: 0 });
    // Uncertainty in January ≈ 277 €: the comfortable amount keeps it as margin, rounded down to 100 €.
    expect(json.rows).toEqual([
      { date: "2027-01-05", extra_monthly_savings_euros: 0, max_euros: 4200, comfortable_euros: 3900 },
      { date: "2027-01-05", extra_monthly_savings_euros: 100, max_euros: 4500, comfortable_euros: 4200 },
    ]);
  });

  it("rejects affordable dates in the past", () => {
    expect(runAdvisorTool("affordable_amounts", { dates: ["2026-01-01"], account_id: "joint", extra_monthly_savings_euros: [0], scope_account_ids: [], floor_euros: 0 }, ctx)).toEqual({
      content: "dates: must not be in the past",
      isError: true,
    });
  });

  it("flags an account outside the scope that would go below zero", () => {
    const { json } = run("simulate_scenario", {
      one_off_expenses: [{ label: "Auto", amount_euros: 6000, date: "2027-01-10", account_id: "savings" }],
      category_cuts: [],
      saving_plans: [],
      months: 3,
      scope_account_ids: ["joint"],
      floor_euros: 0,
    });
    expect(json.feasible).toBe(false);
    expect(json.accounts_below_zero).toEqual([{ account_id: "savings", name: "Risparmi", lowest: { month: "2027-01", total_euros: -1000 } }]);
  });

  it("checks a payment plan the user brought and says how much more to save", () => {
    const out = runAdvisorTool(
      "simulate_scenario",
      {
        one_off_expenses: [
          { label: "Anticipo", amount_euros: 3000, date: "2026-12-01", account_id: "joint" },
          { label: "Maxi rata", amount_euros: 4000, date: "2029-12-01", account_id: "joint" },
        ],
        category_cuts: [],
        saving_plans: [],
        recurring_expenses: [{ label: "Rata", monthly_euros: 450, account_id: "joint", day_of_month: 1, start_date: "2027-01-01", end_date: "2029-11-30" }],
        user_payment_plan: true,
        months: 40,
        scope_account_ids: ["joint"],
        floor_euros: 0,
      },
      ctx,
    );
    const json = JSON.parse(out.content);
    expect(out.paymentPlan).toBe(true);
    // +400 € a month against a 450 € instalment: the balance drains, 50 € a month would not be enough with the final payment.
    expect(json.feasible).toBe(false);
    expect(json.extra_monthly_savings_needed_euros).toBeGreaterThan(50);
    // 40 month ends sampled down to at most 24 points, last one kept.
    expect(json.month_ends.length).toBeLessThanOrEqual(24);
    expect(json.month_ends.at(-1).month).toBe("2030-02");
  });

  it("reports an unknown tool as an error", () => {
    expect(runAdvisorTool("delete_everything", {}, ctx)).toEqual({ content: "Unknown tool: delete_everything", isError: true });
  });
});
