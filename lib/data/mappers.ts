// Database rows (snake_case, bigint as number|string) to domain objects.
import type { Account, Category, ContributionRule, Member, RecurringRule, Transaction } from "../domain/types";

type Row = Record<string, unknown>;

const num = (v: unknown) => (v == null ? 0 : Number(v));
const str = (v: unknown) => (v == null ? null : String(v));

export function mapMember(r: Row): Member {
  return {
    id: String(r.id),
    displayName: String(r.display_name),
    email: str(r.email),
    userId: str(r.user_id),
    role: r.role === "owner" ? "owner" : "member",
  };
}

export function mapAccount(r: Row): Account {
  return {
    id: String(r.id),
    name: String(r.name),
    institution: str(r.institution),
    type: r.type as Account["type"],
    visibility: r.visibility as Account["visibility"],
    ownerMemberId: str(r.owner_member_id),
    openingBalanceCents: num(r.opening_balance_cents),
    openingDate: String(r.opening_date),
    sortOrder: num(r.sort_order),
    archived: r.archived_at != null,
  };
}

export function mapCategory(r: Row): Category {
  return {
    id: String(r.id),
    name: String(r.name),
    kind: r.kind as Category["kind"],
    icon: str(r.icon),
    colorIndex: Math.min(6, Math.max(1, num(r.color_index))) as Category["colorIndex"],
  };
}

export function mapTransaction(r: Row): Transaction {
  return {
    id: String(r.id),
    accountId: String(r.account_id),
    counterpartAccountId: str(r.counterpart_account_id),
    categoryId: str(r.category_id),
    kind: r.kind as Transaction["kind"],
    status: r.status as Transaction["status"],
    amountCents: num(r.amount_cents),
    bookedOn: String(r.booked_on),
    description: String(r.description),
    notes: str(r.notes),
    transferGroupId: str(r.transfer_group_id),
    recurringRuleId: str(r.recurring_rule_id),
    contributionRuleId: str(r.contribution_rule_id),
    occurrenceDate: str(r.occurrence_date),
    source: r.source as Transaction["source"],
  };
}

export function mapRule(r: Row): RecurringRule {
  return {
    id: String(r.id),
    accountId: String(r.account_id),
    counterpartAccountId: str(r.counterpart_account_id),
    categoryId: str(r.category_id),
    kind: r.kind as RecurringRule["kind"],
    description: String(r.description),
    amountCents: num(r.amount_cents),
    frequency: r.frequency as RecurringRule["frequency"],
    schedule: r.schedule as RecurringRule["schedule"],
    dayOfMonth: num(r.day_of_month),
    startDate: String(r.start_date),
    endDate: str(r.end_date),
    active: Boolean(r.active),
  };
}

export function mapContribution(r: Row): ContributionRule {
  return {
    id: String(r.id),
    fromAccountId: String(r.from_account_id),
    toAccountId: String(r.to_account_id),
    description: String(r.description),
    fixedCents: num(r.fixed_cents),
    sharePercent: num(r.share_percent),
    categoryIds: Array.isArray(r.category_ids) ? r.category_ids.map(String) : [],
    roundingCents: num(r.rounding_cents) || 1000,
    dayOfMonth: num(r.day_of_month),
    estimatedSpendingCents: num(r.estimated_spending_cents),
    spendingAccountId: str(r.spending_account_id),
    spendingMonthOffset: num(r.spending_month_offset) === -1 ? -1 : 0,
    startDate: String(r.start_date),
    endDate: str(r.end_date),
    active: Boolean(r.active),
  };
}
