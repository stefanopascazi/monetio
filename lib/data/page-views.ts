// Pure builders turning loaded data into view models for pages.
import { contributionAmount, contributionBase } from "../domain/contribution";
import { monthKey } from "../domain/dates";
import { nextOccurrence } from "../domain/recurrence";
import type { DueEntry, SpendingLookup } from "../domain/schedule";
import type { Account, Category, ContributionRule, RecurringRule, RuleFrequency } from "../domain/types";
import { ownsRule } from "./rule-visibility";
import { HIDDEN_ACCOUNT } from "./views";

type Named = Pick<Account, "id" | "name">;

/** Visible accounts plus labels of hidden ones ("Conto privato di Asha"). */
const nameOf = (accounts: Named[], hidden: Named[], id: string | null) =>
  id ? (accounts.find((a) => a.id === id)?.name ?? hidden.find((a) => a.id === id)?.name ?? HIDDEN_ACCOUNT) : "";

/**
 * Amount from the viewer's side: a transfer seen only through its counterpart is money in
 * for them (amounts are signed for the paying account).
 */
const viewerCents = (amountCents: number, payerVisible: boolean, counterpartId: string | null) =>
  !payerVisible && counterpartId ? -amountCents : amountCents;

export function dueViews(entries: DueEntry[], rules: RecurringRule[], accounts: Named[], hidden: Named[] = []) {
  const visible = new Set(accounts.map((a) => a.id));
  return entries.map((e) => ({
    key: e.key,
    accountId: e.accountId,
    date: e.date,
    description: e.description,
    amountCents: viewerCents(e.amountCents, visible.has(e.accountId), e.counterpartAccountId),
    accountName: e.counterpartAccountId
      ? `${nameOf(accounts, hidden, e.accountId)} → ${nameOf(accounts, hidden, e.counterpartAccountId)}`
      : nameOf(accounts, hidden, e.accountId),
    frequency: (e.source === "rule" ? (rules.find((r) => r.id === e.ruleId)?.frequency ?? "monthly") : "monthly") as RuleFrequency,
    estimated: e.estimated,
    confirmed: e.confirmed,
    note: e.note ?? null,
    /** Only rule occurrences accept an actual amount (contributions are computed). */
    canConfirm: e.source === "rule",
    payable: visible.has(e.accountId),
    kind: e.kind,
    paymentMethod: e.paymentMethod,
    feeCents: e.feeCents,
  }));
}

export function ruleViews(rules: RecurringRule[], accounts: Named[], today: string, categories: Pick<Category, "id" | "name">[] = [], hidden: Named[] = []) {
  const visible = new Set(accounts.map((a) => a.id));
  return rules.map((r) => ({
    ...r,
    categoryName: categories.find((c) => c.id === r.categoryId)?.name ?? null,
    accountName: r.counterpartAccountId
      ? `${nameOf(accounts, hidden, r.accountId)} → ${nameOf(accounts, hidden, r.counterpartAccountId)}`
      : nameOf(accounts, hidden, r.accountId),
    /** Paying account label, used to group rules (hidden accounts carry their owner). */
    sourceName: nameOf(accounts, hidden, r.accountId),
    viewCents: viewerCents(r.amountCents, visible.has(r.accountId), r.counterpartAccountId),
    nextDate: r.active ? nextOccurrence(r, today) : null,
    /** False for transfers seen only through the counterpart: read-only for the viewer. */
    editable: ownsRule(r, visible),
  }));
}

export function contributionViews(items: ContributionRule[], accounts: Named[], today: string, spending: SpendingLookup, hidden: Named[] = []) {
  const visible = new Set(accounts.map((a) => a.id));
  return items.map((c) => ({
    ...c,
    fromName: nameOf(accounts, hidden, c.fromAccountId),
    toName: nameOf(accounts, hidden, c.toAccountId),
    currentCents: contributionAmount(c, contributionBase(c, monthKey(today), monthKey(today), spending).baseCents),
    spendingName: nameOf(accounts, hidden, c.spendingAccountId ?? c.toAccountId),
    editable: visible.has(c.fromAccountId),
  }));
}
