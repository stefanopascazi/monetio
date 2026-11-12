import { describe, expect, it } from "vitest";
import { rule, txn } from "../domain/fixtures";
import { type AccountWithBalance, buildAgenda, buildProjectionInput, decrementCategories, projectionFlowsSince } from "./projection-input";

const account = (id: string, extra: Partial<AccountWithBalance> = {}): AccountWithBalance => ({
  id,
  name: id,
  institution: null,
  type: "checking",
  visibility: "shared",
  ownerMemberId: null,
  openingBalanceCents: 0,
  openingDate: "2026-01-01",
  sortOrder: 0,
  archived: false,
  ibanMasked: null,
  bic: null,
  cardLast4: [],
  balanceCents: 10000,
  ...extra,
});

const today = "2026-11-12";
const raw = { today, contributions: [], occurrences: [], flows: [], overrides: [] };

describe("buildAgenda", () => {
  it("lists unpaid due occurrences and upcoming automatic ones", () => {
    const due = rule({ id: "due", amountCents: -5000, schedule: "due", dayOfMonth: 15 });
    const auto = rule({ id: "auto", amountCents: -1000, schedule: "auto", dayOfMonth: 20 });
    const agenda = buildAgenda({ ...raw, rules: [due, auto] });
    expect(agenda.due.map((d) => [d.ruleId, d.date])).toContainEqual(["due", "2026-11-15"]);
    expect(agenda.upcoming.length).toBeGreaterThan(0);
  });

  it("skips occurrences already booked", () => {
    const due = rule({ id: "due", amountCents: -5000, schedule: "due", dayOfMonth: 15 });
    const agenda = buildAgenda({ ...raw, rules: [due], occurrences: [{ recurringRuleId: "due", contributionRuleId: null, occurrenceDate: "2026-11-15" }] });
    expect(agenda.due.some((d) => d.date === "2026-11-15")).toBe(false);
  });
});

describe("buildProjectionInput", () => {
  const rules = [rule({ id: "mine", accountId: "a1", amountCents: -100 }), rule({ id: "other", accountId: "hidden", amountCents: -100 })];
  const agenda = buildAgenda({ ...raw, rules });

  it("keeps only active accounts, rules and planned rows the viewer sees", () => {
    const { active, input } = buildProjectionInput(
      agenda,
      {
        accounts: [account("a1"), account("old", { archived: true })],
        planned: [txn({ amountCents: -10, bookedOn: "2026-11-20", status: "planned" }), txn({ accountId: "hidden", amountCents: -10, bookedOn: "2026-11-20", status: "planned" })],
        monthFlows: [],
        estimateMovements: [],
      },
      3,
    );
    expect(active.map((a) => a.id)).toEqual(["a1"]);
    expect(input.balances).toEqual({ a1: 10000 });
    expect(input.rules.map((r) => r.id)).toEqual(["mine"]);
    expect(input.planned).toHaveLength(1);
    expect(input.months).toBe(3);
  });

  it("marks card accounts", () => {
    const { input } = buildProjectionInput(agenda, { accounts: [account("c", { type: "card" })], planned: [], monthFlows: [], estimateMovements: [] }, 1);
    expect([...(input.cardAccountIds ?? [])]).toEqual(["c"]);
  });
});

describe("helpers", () => {
  it("collects decrement categories of decreasing estimates only", () => {
    const rules = [
      rule({ id: "e", amountCents: -100, schedule: "estimate", decrementCategoryIds: ["food", "home"] }),
      rule({ id: "f", amountCents: -100, schedule: "estimate", decrementCategoryIds: ["food"] }),
      rule({ id: "g", amountCents: -100, schedule: "auto", decrementCategoryIds: ["car"] }),
    ];
    expect(decrementCategories(rules)).toEqual(["food", "home"]);
  });

  it("starts projection flows from the previous month", () => {
    expect(projectionFlowsSince("2026-01-10")).toBe("2025-12");
  });
});
