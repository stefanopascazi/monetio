import { describe, expect, it } from "vitest";
import { rule } from "../domain/fixtures";
import type { RecurringRule } from "../domain/types";
import type { MonthlyFlow } from "../data/flow-math";
import { type AccountWithBalance, buildAgenda, buildProjectionInput } from "../data/projection-input";
import { budgetEvents, dueEvents, type EventSnapshot, formatEuro, lowBalanceEvents, selectEvents, staleAccountEvents } from "./events";
import { DEFAULT_PREFS, type NotificationPrefs } from "./prefs";

const today = "2026-11-12";

const account = (id: string, extra: Partial<AccountWithBalance> = {}): AccountWithBalance => ({
  id,
  name: id === "a1" ? "Conto comune" : id,
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
  balanceCents: 100_000,
  ...extra,
});

interface Setup {
  rules?: RecurringRule[];
  accounts?: AccountWithBalance[];
  prefs?: Partial<NotificationPrefs>;
  monthFlows?: MonthlyFlow[];
  lastBooked?: Record<string, string | null>;
  householdLabel?: string | null;
  occurrences?: { recurringRuleId: string; contributionRuleId: null; occurrenceDate: string }[];
}

function snapshot({ rules = [], accounts = [account("a1")], prefs = {}, monthFlows = [], lastBooked = { a1: today }, householdLabel = null, occurrences = [] }: Setup = {}): EventSnapshot {
  const agenda = buildAgenda({ today, rules, contributions: [], occurrences, flows: monthFlows, overrides: [] });
  return {
    userId: "u1",
    householdId: "h1",
    householdLabel,
    prefs: { ...DEFAULT_PREFS, ...prefs },
    agenda,
    projection: buildProjectionInput(agenda, { accounts, planned: [], monthFlows, estimateMovements: [] }, 1),
    monthFlows,
    estimateMovements: [],
    lastBooked,
  };
}

const dueRule = (day: number, extra: Partial<RecurringRule> = {}) =>
  rule({ id: `due${day}`, description: "Bolletta luce", amountCents: -8_550, schedule: "due", dayOfMonth: day, startDate: "2026-11-01", ...extra });

describe("dueEvents", () => {
  it("reminds due items within the configured days", () => {
    const events = dueEvents(snapshot({ rules: [dueRule(14), dueRule(20)] }));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "due_soon", title: "Scadenza tra 2 giorni", url: "/scadenze" });
    expect(events[0].body).toBe(`Bolletta luce · ${formatEuro(8_550)}`);
    expect(events[0].dedupKey).toMatch(/^due_soon:u1:h1:/);
  });

  it("labels today and tomorrow", () => {
    expect(dueEvents(snapshot({ rules: [dueRule(12)] }))[0].title).toBe("Scadenza oggi");
    expect(dueEvents(snapshot({ rules: [dueRule(13)] }))[0].title).toBe("Scadenza domani");
  });

  it("announces recent overdue items only", () => {
    const events = dueEvents(snapshot({ rules: [dueRule(8), dueRule(2)] }));
    expect(events.map((e) => [e.kind, e.title])).toEqual([["overdue", "Scadenza superata"]]);
  });

  it("ignores items of accounts the user does not see or already paid", () => {
    expect(dueEvents(snapshot({ rules: [dueRule(14, { accountId: "hidden" })] }))).toEqual([]);
    expect(dueEvents(snapshot({ rules: [dueRule(14)], occurrences: [{ recurringRuleId: "due14", contributionRuleId: null, occurrenceDate: "2026-11-14" }] }))).toEqual([]);
  });

  it("skips items with nothing to pay", () => {
    expect(dueEvents(snapshot({ rules: [dueRule(14, { amountCents: 0 })] }))).toEqual([]);
  });

  it("names the household for users of several households", () => {
    expect(dueEvents(snapshot({ rules: [dueRule(14)], householdLabel: "Casa al mare" }))[0].body).toMatch(/ · Casa al mare$/);
  });
});

describe("lowBalanceEvents", () => {
  const rent = rule({ id: "rent", amountCents: -150_000, schedule: "auto", dayOfMonth: 25, startDate: "2026-11-01" });

  it("flags accounts expected below zero at month end", () => {
    const events = lowBalanceEvents(snapshot({ rules: [rent] }));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "low_balance", url: "/conti/a1", dedupKey: "low_balance:u1:h1:a1:2026-11" });
    expect(events[0].body).toContain("Conto comune");
  });

  it("uses the per-account threshold", () => {
    expect(lowBalanceEvents(snapshot({ prefs: { lowBalanceCents: { a1: 200_000 } } }))).toHaveLength(1);
    expect(lowBalanceEvents(snapshot({ rules: [rent], prefs: { lowBalanceCents: { a1: -100_000 } } }))).toHaveLength(0);
  });

  it("skips card accounts", () => {
    expect(lowBalanceEvents(snapshot({ accounts: [account("c", { type: "card", balanceCents: -50_000 })], lastBooked: {} }))).toEqual([]);
  });
});

describe("staleAccountEvents", () => {
  it("flags accounts without movements for the configured days", () => {
    const events = staleAccountEvents(snapshot({ lastBooked: { a1: "2026-10-20" } }));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "stale_account", dedupKey: "stale_account:u1:h1:a1:2026-10-20" });
    expect(events[0].body).toContain("da 23 giorni");
    expect(staleAccountEvents(snapshot({ lastBooked: { a1: "2026-11-01" } }))).toEqual([]);
  });

  it("falls back to the opening date for accounts never used", () => {
    expect(staleAccountEvents(snapshot({ accounts: [account("a1", { openingDate: "2026-11-10" })], lastBooked: { a1: null } }))).toEqual([]);
    expect(staleAccountEvents(snapshot({ lastBooked: { a1: null } }))).toHaveLength(1);
  });
});

describe("budgetEvents", () => {
  const groceries = rule({ id: "food", description: "Spesa", amountCents: -40_000, schedule: "estimate", categoryId: "food", startDate: "2026-01-01" });
  const flow = (totalCents: number): MonthlyFlow => ({ accountId: "a1", month: "2026-11", categoryId: "food", kind: "expense", counterpartAccountId: null, totalCents });

  it("flags monthly expense estimates already exceeded", () => {
    const events = budgetEvents(snapshot({ rules: [groceries], monthFlows: [flow(-45_000)] }));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "budget_exceeded", url: "/analisi/proiezioni", dedupKey: "budget_exceeded:u1:h1:food:2026-11" });
    expect(events[0].body).toBe(`Spesa: ${formatEuro(45_000)} su ${formatEuro(40_000)} previsti questo mese`);
  });

  it("stays quiet within the estimate", () => {
    expect(budgetEvents(snapshot({ rules: [groceries], monthFlows: [flow(-40_000)] }))).toEqual([]);
  });
});

describe("selectEvents", () => {
  it("combines every kind", () => {
    const events = selectEvents(snapshot({ rules: [dueRule(13)], lastBooked: { a1: "2026-09-01" } }));
    expect(new Set(events.map((e) => e.kind))).toEqual(new Set(["due_soon", "stale_account"]));
  });
});
