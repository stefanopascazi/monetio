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

  it("reports an unknown tool as an error", () => {
    expect(runAdvisorTool("delete_everything", {}, ctx)).toEqual({ content: "Unknown tool: delete_everything", isError: true });
  });
});
