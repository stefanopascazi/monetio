// Tools the advisor model may call: thin wrappers over the deterministic domain (the model never computes numbers).
import type Anthropic from "@anthropic-ai/sdk";
import { monthKey, monthsBetween } from "../domain/dates";
import type { ProjectionMonth } from "../domain/projection";
import { combinedUncertainty } from "../domain/reliability";
import { type CategoryCut, type LowestPoint, type SavingPlan, type OneOffExpense, simulateScenario } from "../domain/scenario";
import { assessGoal, type Lever, type VerdictOutcome } from "../domain/verdict";
import { type AdvisorContext, liquidAccountIds } from "./context";

/** Default horizon of projections and simulations, in month ends. */
const DEFAULT_MONTHS = 12;
const MAX_MONTHS = 36;

/** Engine verdict of the last assess_goal call, shown by the UI next to the model's words. */
export interface AdvisorVerdict {
  outcome: VerdictOutcome;
  goal: { label: string; amountCents: number; date: string; accountId: string };
  lowest: LowestPoint;
  shortfallCents: number;
  tight: boolean;
  levers: Lever[];
}

export interface ToolOutcome {
  /** JSON sent back to the model. */
  content: string;
  isError?: boolean;
  verdict?: AdvisorVerdict;
}

const str = { type: "string" } as const;
const num = { type: "number" } as const;
const ids = { type: "array", items: str } as const;
const scope = { ...ids, description: "Account ids the verdict looks at; empty = spending accounts (checking, cards, cash)." };
const floor = { ...num, description: "Lowest acceptable month-end total of those accounts, in euros (usually 0)." };

export const ADVISOR_TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "get_household_overview",
    description: "Today's date, accounts with current balance (euros), expense categories and how reliable the projection is. Call it first.",
    strict: true,
    input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    name: "get_projection",
    description: "Expected month-end total of the chosen accounts from the current month on, from recurring rules, estimates and planned movements.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { months: { type: "integer", description: "Month ends to return, 1-36." }, scope_account_ids: scope },
      required: ["months", "scope_account_ids"],
      additionalProperties: false,
    },
  },
  {
    name: "assess_goal",
    description:
      "Verdict on a one-off spending goal: yes, no, or yes if one budget lever is used (postpone to a date, spend less, cut a category by a percentage). Each lever works on its own.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        label: str,
        amount_euros: num,
        date: { ...str, description: "YYYY-MM-DD" },
        account_id: { ...str, description: "Account the expense is paid from." },
        cut_category_ids: { ...ids, description: "Discretionary expense categories the household may cut." },
        scope_account_ids: scope,
        floor_euros: floor,
      },
      required: ["label", "amount_euros", "date", "account_id", "cut_category_ids", "scope_account_ids", "floor_euros"],
      additionalProperties: false,
    },
  },
  {
    name: "simulate_scenario",
    description: "What-if projection with one-off expenses, category cuts and monthly set-asides, compared with the current projection.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        one_off_expenses: {
          type: "array",
          items: {
            type: "object",
            properties: { label: str, amount_euros: num, date: { ...str, description: "YYYY-MM-DD" }, account_id: str },
            required: ["label", "amount_euros", "date", "account_id"],
            additionalProperties: false,
          },
        },
        category_cuts: {
          type: "array",
          items: {
            type: "object",
            properties: { category_id: str, percent: num, from_date: { ...str, description: "YYYY-MM-DD, empty = today." } },
            required: ["category_id", "percent", "from_date"],
            additionalProperties: false,
          },
        },
        saving_plans: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: str,
              monthly_euros: num,
              from_account_id: str,
              to_account_id: { ...str, description: "Destination account; empty = money kept aside." },
              day_of_month: { type: "integer" },
              start_date: { ...str, description: "YYYY-MM-DD" },
              end_date: { ...str, description: "YYYY-MM-DD, empty = no end." },
            },
            required: ["label", "monthly_euros", "from_account_id", "to_account_id", "day_of_month", "start_date", "end_date"],
            additionalProperties: false,
          },
        },
        months: { type: "integer", description: "Month ends to simulate, 1-36." },
        scope_account_ids: scope,
        floor_euros: floor,
      },
      required: ["one_off_expenses", "category_cuts", "saving_plans", "months", "scope_account_ids", "floor_euros"],
      additionalProperties: false,
    },
  },
];

class InvalidInput extends Error {}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const euros = (cents: number) => Math.round(cents) / 100;
const cents = (value: unknown, field: string, allowZero = false) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || (!allowZero && n === 0)) throw new InvalidInput(`${field}: invalid amount`);
  return Math.round(n * 100);
};
const date = (value: unknown, field: string) => {
  if (typeof value !== "string" || !DATE.test(value)) throw new InvalidInput(`${field}: expected YYYY-MM-DD`);
  return value;
};
const optionalDate = (value: unknown, field: string) => (value === "" || value == null ? null : date(value, field));
const months = (value: unknown) => Math.min(MAX_MONTHS, Math.max(1, Math.round(Number(value)) || DEFAULT_MONTHS));

function account(ctx: AdvisorContext, id: unknown, field: string): string {
  if (typeof id !== "string" || !ctx.accounts.some((a) => a.id === id)) throw new InvalidInput(`${field}: unknown account`);
  return id;
}

function category(ctx: AdvisorContext, id: unknown, field: string): string {
  if (typeof id !== "string" || !ctx.categories.some((c) => c.id === id)) throw new InvalidInput(`${field}: unknown expense category`);
  return id;
}

function scopeIds(ctx: AdvisorContext, value: unknown): string[] {
  const list = Array.isArray(value) ? value.filter((id): id is string => ctx.accounts.some((a) => a.id === id)) : [];
  return list.length ? list : liquidAccountIds(ctx);
}

const scopeTotals = (months: ProjectionMonth[], ids: string[]) =>
  months.map((m) => ({ month: m.month, total_euros: euros(ids.reduce((s, id) => s + (m.byAccount[id] ?? 0), 0)) }));
const lowestEuros = (p: LowestPoint) => ({ month: p.month, total_euros: euros(p.cents) });

function overview(ctx: AdvisorContext) {
  const balances = ctx.input.balances;
  return {
    today: ctx.input.today,
    accounts: ctx.accounts.map((a) => ({ id: a.id, name: a.name, type: a.type, balance_euros: euros(balances[a.id] ?? 0) })),
    spending_account_ids: liquidAccountIds(ctx),
    expense_categories: ctx.categories,
    reliability: ctx.reliability,
  };
}

function projection(ctx: AdvisorContext, input: Record<string, unknown>) {
  const ids = scopeIds(ctx, input.scope_account_ids);
  const result = simulateScenario({ ...ctx.input, months: months(input.months) }, {}, { accountIds: ids });
  return { scope_account_ids: ids, month_ends: scopeTotals(result.baseline, ids), lowest: lowestEuros(result.baselineLowest) };
}

function goal(ctx: AdvisorContext, input: Record<string, unknown>): ToolOutcome {
  const ids = scopeIds(ctx, input.scope_account_ids);
  const g = {
    label: String(input.label ?? "Obiettivo"),
    amountCents: cents(input.amount_euros, "amount_euros"),
    date: date(input.date, "date"),
    accountId: account(ctx, input.account_id, "account_id"),
  };
  if (g.date < ctx.input.today) throw new InvalidInput("date: must not be in the past");
  const cutIds = Array.isArray(input.cut_category_ids) ? input.cut_category_ids.map((id, i) => category(ctx, id, `cut_category_ids[${i}]`)) : [];
  const floorCents = cents(input.floor_euros ?? 0, "floor_euros", true);
  const ahead = monthsBetween(monthKey(ctx.input.today), monthKey(g.date)) + 1;
  const v = assessGoal({ ...ctx.input, months: DEFAULT_MONTHS }, g, {
    accountIds: ids,
    floorCents,
    cutCategoryIds: cutIds,
    uncertaintyCents: combinedUncertainty(ctx.bands, ids, ahead),
    reliability: ctx.reliability.level,
  });
  const verdict: AdvisorVerdict = { outcome: v.outcome, goal: g, lowest: v.result.lowest, shortfallCents: v.result.shortfallCents, tight: v.tight, levers: v.levers };
  const levers = v.levers.map((l) =>
    l.kind === "postpone" ? { kind: l.kind, date: l.date } : l.kind === "reduce" ? { kind: l.kind, max_amount_euros: euros(l.amountCents) } : l,
  );
  const content = {
    outcome: v.outcome,
    tight: v.tight,
    reliability: ctx.reliability.level,
    scope_account_ids: ids,
    lowest_with_goal: lowestEuros(v.result.lowest),
    lowest_without_goal: lowestEuros(v.result.baselineLowest),
    shortfall_euros: euros(v.result.shortfallCents),
    levers,
  };
  return { content: JSON.stringify(content), verdict };
}

function scenario(ctx: AdvisorContext, input: Record<string, unknown>) {
  const ids = scopeIds(ctx, input.scope_account_ids);
  const list = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
  const oneOffExpenses: OneOffExpense[] = list(input.one_off_expenses).map((e, i) => ({
    label: String(e.label ?? "Spesa"),
    amountCents: cents(e.amount_euros, `one_off_expenses[${i}].amount_euros`),
    date: date(e.date, `one_off_expenses[${i}].date`),
    accountId: account(ctx, e.account_id, `one_off_expenses[${i}].account_id`),
  }));
  const categoryCuts: CategoryCut[] = list(input.category_cuts).map((c, i) => ({
    categoryId: category(ctx, c.category_id, `category_cuts[${i}].category_id`),
    percent: Number(c.percent) || 0,
    from: optionalDate(c.from_date, `category_cuts[${i}].from_date`) ?? undefined,
  }));
  const savingPlans: SavingPlan[] = list(input.saving_plans).map((p, i) => ({
    label: String(p.label ?? "Accantonamento"),
    monthlyCents: cents(p.monthly_euros, `saving_plans[${i}].monthly_euros`),
    fromAccountId: account(ctx, p.from_account_id, `saving_plans[${i}].from_account_id`),
    toAccountId: p.to_account_id ? account(ctx, p.to_account_id, `saving_plans[${i}].to_account_id`) : null,
    dayOfMonth: Math.min(31, Math.max(1, Math.round(Number(p.day_of_month)) || 1)),
    startDate: date(p.start_date, `saving_plans[${i}].start_date`),
    endDate: optionalDate(p.end_date, `saving_plans[${i}].end_date`),
  }));
  const r = simulateScenario(
    { ...ctx.input, months: months(input.months) },
    { oneOffExpenses, categoryCuts, savingPlans },
    { accountIds: ids, floorCents: cents(input.floor_euros ?? 0, "floor_euros", true) },
  );
  const base = scopeTotals(r.baseline, ids);
  return {
    scope_account_ids: ids,
    feasible: r.feasible,
    shortfall_euros: euros(r.shortfallCents),
    lowest_current: lowestEuros(r.baselineLowest),
    lowest_scenario: lowestEuros(r.lowest),
    month_ends: scopeTotals(r.scenario, ids).map((m, i) => ({ ...m, current_euros: base[i].total_euros })),
  };
}

/** Runs one tool call; bad input comes back as an error result the model can correct. */
export function runAdvisorTool(name: string, input: unknown, ctx: AdvisorContext): ToolOutcome {
  const args = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  try {
    switch (name) {
      case "get_household_overview":
        return { content: JSON.stringify(overview(ctx)) };
      case "get_projection":
        return { content: JSON.stringify(projection(ctx, args)) };
      case "assess_goal":
        return goal(ctx, args);
      case "simulate_scenario":
        return { content: JSON.stringify(scenario(ctx, args)) };
      default:
        return { content: `Unknown tool: ${name}`, isError: true };
    }
  } catch (e) {
    if (e instanceof InvalidInput) return { content: e.message, isError: true };
    throw e;
  }
}
