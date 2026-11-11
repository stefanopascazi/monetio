// Database rows (snake_case, bigint as number|string) to domain objects.
import { maskIban } from "../banking/identifiers";
import { feeSource } from "../domain/fees";
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
    // Legacy "owner" rows are admins.
    role: r.role === "admin" || r.role === "owner" ? "admin" : "member",
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
    ibanMasked: r.iban ? maskIban(String(r.iban)) : null,
    bic: str(r.bic),
    cardLast4: Array.isArray(r.card_last4) ? r.card_last4.map(String) : [],
  };
}

export function mapCategory(r: Row): Category {
  return {
    id: String(r.id),
    name: String(r.name),
    kind: r.kind as Category["kind"],
    icon: str(r.icon),
    colorIndex: Math.min(6, Math.max(1, num(r.color_index))) as Category["colorIndex"],
    archived: r.archived_at != null,
  };
}

/**
 * Sets `feeCents` (positive total) on payments and transfers from their linked fee rows.
 * A transfer's fee links to its paying side: `sides` (row id + transfer group) shares it with
 * the receiving side, so the transfer can be edited from either account.
 */
export function attachFees(txns: Transaction[], fees: { parentId: string; amountCents: number }[], sides: { id: string; groupId: string }[] = []): Transaction[] {
  const totals = new Map<string, number>();
  for (const f of fees) totals.set(f.parentId, (totals.get(f.parentId) ?? 0) + Math.abs(f.amountCents));
  const groupTotals = new Map<string, number>();
  for (const s of sides) if (totals.has(s.id)) groupTotals.set(s.groupId, totals.get(s.id)!);
  return txns.map((t) => {
    const fee = totals.get(t.id) ?? (t.transferGroupId && !t.parentTransactionId ? groupTotals.get(t.transferGroupId) : undefined);
    return fee === undefined ? t : { ...t, feeCents: fee };
  });
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
    paymentMethod: (str(r.payment_method) as Transaction["paymentMethod"]) ?? null,
    parentTransactionId: str(r.parent_transaction_id),
    feeCents: null,
    recurringRuleId: str(r.recurring_rule_id),
    contributionRuleId: str(r.contribution_rule_id),
    occurrenceDate: str(r.occurrence_date),
    source: r.source as Transaction["source"],
    createdBy: str(r.created_by),
    skipEstimates: Boolean(r.skip_estimates),
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
    paymentMethod: (str(r.payment_method) as RecurringRule["paymentMethod"]) ?? null,
    feeCents: feeSource(String(r.kind), str(r.payment_method) as RecurringRule["paymentMethod"]) ? num(r.fee_cents) : 0,
    decrementCategoryIds: Array.isArray(r.decrement_category_ids) ? r.decrement_category_ids.map(String) : [],
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
    roundingCents: num(r.rounding_cents) || 1,
    dayOfMonth: num(r.day_of_month),
    estimatedSpendingCents: num(r.estimated_spending_cents),
    spendingAccountId: str(r.spending_account_id),
    spendingMonthOffset: num(r.spending_month_offset) === -1 ? -1 : 0,
    startDate: String(r.start_date),
    endDate: str(r.end_date),
    active: Boolean(r.active),
  };
}

export interface ListTotals {
  count: number;
  incomeCents: number;
  expenseCents: number;
}

/** Row of the `transaction_totals` RPC (bigints arrive as strings or numbers). */
export function mapTotals(r: Row | null | undefined): ListTotals {
  return { count: Number(r?.count ?? 0), incomeCents: Number(r?.income_cents ?? 0), expenseCents: Number(r?.expense_cents ?? 0) };
}
