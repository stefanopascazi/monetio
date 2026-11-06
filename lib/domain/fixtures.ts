// Test builders for domain objects.
import type { ContributionRule, RecurringRule, Transaction } from "./types";

export function txn(p: Partial<Transaction> & Pick<Transaction, "amountCents" | "bookedOn">): Transaction {
  return {
    id: p.id ?? `t-${p.bookedOn}-${p.amountCents}`,
    accountId: "a1",
    counterpartAccountId: null,
    categoryId: null,
    kind: p.amountCents < 0 ? "expense" : "income",
    status: "booked",
    description: "x",
    notes: null,
    transferGroupId: null,
    recurringRuleId: null,
    contributionRuleId: null,
    occurrenceDate: null,
    source: "manual",
    createdBy: null,
    ...p,
  };
}

export function rule(p: Partial<RecurringRule> & Pick<RecurringRule, "amountCents">): RecurringRule {
  return {
    id: "r1",
    accountId: "a1",
    counterpartAccountId: null,
    categoryId: null,
    kind: p.amountCents < 0 ? "expense" : "income",
    description: "rule",
    frequency: "monthly",
    schedule: "auto",
    dayOfMonth: 1,
    startDate: "2026-01-01",
    endDate: null,
    active: true,
    ...p,
  };
}

export function contribution(p: Partial<ContributionRule> = {}): ContributionRule {
  return {
    id: "c1",
    fromAccountId: "ste",
    toAccountId: "joint",
    description: "Quota Ste",
    fixedCents: 80000,
    sharePercent: 50,
    categoryIds: ["spesa"],
    roundingCents: 1000,
    dayOfMonth: 28,
    estimatedSpendingCents: 45000,
    spendingAccountId: null,
    spendingMonthOffset: 0,
    startDate: "2026-01-01",
    endDate: null,
    active: true,
    ...p,
  };
}
