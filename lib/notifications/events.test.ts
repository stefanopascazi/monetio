import { describe, expect, it } from "vitest";
import { rule } from "../domain/fixtures";
import type { EstimateMovement } from "../domain/estimates";
import { spentCents } from "../domain/estimates";
import { projectedMovements } from "../domain/projection";
import type { RecurringRule } from "../domain/types";
import type { MonthlyFlow } from "../data/flow-math";
import { type AccountWithBalance, buildAgenda, buildProjectionInput } from "../data/projection-input";
import { accountName, budgetEvents, dueEvents, type EventSnapshot, formatEuro, lowBalanceEvents, selectEvents, staleAccountEvents } from "./events";
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
  estimateMovements?: EstimateMovement[];
  lastBooked?: Record<string, string | null>;
  householdLabel?: string | null;
  occurrences?: { recurringRuleId: string; contributionRuleId: null; occurrenceDate: string }[];
}

function snapshot({ rules = [], accounts = [account("a1")], prefs = {}, monthFlows = [], estimateMovements = [], lastBooked = { a1: today }, householdLabel = null, occurrences = [] }: Setup = {}): EventSnapshot {
  const agenda = buildAgenda({ today, rules, contributions: [], occurrences, flows: monthFlows, overrides: [] });
  return {
    userId: "u1",
    householdId: "h1",
    householdLabel,
    prefs: { ...DEFAULT_PREFS, ...prefs },
    agenda,
    projection: buildProjectionInput(agenda, { accounts, planned: [], monthFlows, estimateMovements }, 1),
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
    expect(events[0].body).toBe(`Bolletta luce · Conto comune · ${formatEuro(8_550)}`);
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
  // Decreasing estimate: booked movements in its categories reduce it (the account page shows the same usage).
  const monthly = rule({ id: "est", description: "Spese mensili", amountCents: -28_000, schedule: "estimate", dayOfMonth: 1, startDate: "2026-11-01", decrementCategoryIds: ["cash", "misc"] });
  const mv = (id: string, categoryId: string, amountCents: number): EstimateMovement => ({ id, accountId: "a1", categoryId, amountCents, description: id, bookedOn: "2026-11-04" });
  const spent = [mv("prelievo", "cash", -80_000), mv("tabaccaio", "misc", -20_729)];

  it("flags decreasing estimates gone beyond, naming the account", () => {
    const events = budgetEvents(snapshot({ rules: [monthly], estimateMovements: spent }));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "budget_exceeded", url: "/conti/a1", dedupKey: "budget_exceeded:u1:h1:est:2026-11" });
    expect(events[0].body).toBe(`Spese mensili · Conto comune: ${formatEuro(100_729)} su ${formatEuro(28_000)} previsti questo mese`);
  });

  it("reports the same figure as the projection's estimate usage", () => {
    const s = snapshot({ rules: [monthly], estimateMovements: spent });
    const usage = projectedMovements(s.projection.input).find((m) => m.ref?.startsWith("r:est|"))?.usage;
    expect(usage).toMatchObject({ usedCents: 28_000, overCents: 72_729 });
    expect(budgetEvents(s)[0].body).toContain(formatEuro(spentCents(usage!)));
  });

  it("stays quiet within the estimate", () => {
    expect(budgetEvents(snapshot({ rules: [monthly], estimateMovements: [mv("x", "cash", -28_000)] }))).toEqual([]);
  });

  it("ignores fixed estimates, which track no spending", () => {
    const fixed = rule({ id: "fixed", description: "Spese mensili", amountCents: -28_000, schedule: "estimate", categoryId: null, startDate: "2026-11-01" });
    const rent: MonthlyFlow = { accountId: "a1", month: "2026-11", categoryId: "home", kind: "expense", counterpartAccountId: null, totalCents: -150_000 };
    expect(budgetEvents(snapshot({ rules: [fixed], monthFlows: [rent] }))).toEqual([]);
  });
});

describe("accountName", () => {
  it("names visible accounts and falls back for the others", () => {
    const s = snapshot();
    expect(accountName(s, "a1")).toBe("Conto comune");
    expect(accountName(s, "hidden")).toBe("conto");
  });
});

describe("selectEvents", () => {
  it("combines every kind", () => {
    const events = selectEvents(snapshot({ rules: [dueRule(13)], lastBooked: { a1: "2026-09-01" } }));
    expect(new Set(events.map((e) => e.kind))).toEqual(new Set(["due_soon", "stale_account"]));
  });
});
