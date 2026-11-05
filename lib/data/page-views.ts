// Pure builders turning loaded data into view models for pages.
import { contributionAmount } from "../domain/contribution";
import { monthKey } from "../domain/dates";
import { nextOccurrence } from "../domain/recurrence";
import type { DueEntry, SpendingLookup } from "../domain/schedule";
import type { Account, ContributionRule, RecurringRule, RuleFrequency } from "../domain/types";
import { HIDDEN_ACCOUNT } from "./views";

type Named = Pick<Account, "id" | "name">;

const nameOf = (accounts: Named[], id: string | null) => (id ? (accounts.find((a) => a.id === id)?.name ?? HIDDEN_ACCOUNT) : "");

export function dueViews(entries: DueEntry[], rules: RecurringRule[], accounts: Named[]) {
  const visible = new Set(accounts.map((a) => a.id));
  return entries.map((e) => ({
    key: e.key,
    date: e.date,
    description: e.description,
    amountCents: e.amountCents,
    accountName: e.counterpartAccountId ? `${nameOf(accounts, e.accountId)} → ${nameOf(accounts, e.counterpartAccountId)}` : nameOf(accounts, e.accountId),
    frequency: (e.source === "rule" ? (rules.find((r) => r.id === e.ruleId)?.frequency ?? "monthly") : "monthly") as RuleFrequency,
    estimated: e.estimated,
    payable: visible.has(e.accountId),
  }));
}

export function ruleViews(rules: RecurringRule[], accounts: Named[], today: string) {
  return rules.map((r) => ({
    ...r,
    accountName: r.counterpartAccountId ? `${nameOf(accounts, r.accountId)} → ${nameOf(accounts, r.counterpartAccountId)}` : nameOf(accounts, r.accountId),
    nextDate: r.active ? nextOccurrence(r, today) : null,
  }));
}

export function contributionViews(items: ContributionRule[], accounts: Named[], today: string, spending: SpendingLookup) {
  const visible = new Set(accounts.map((a) => a.id));
  return items.map((c) => ({
    ...c,
    fromName: nameOf(accounts, c.fromAccountId),
    toName: nameOf(accounts, c.toAccountId),
    currentCents: contributionAmount(c, spending(c, monthKey(today))),
    editable: visible.has(c.fromAccountId),
  }));
}
