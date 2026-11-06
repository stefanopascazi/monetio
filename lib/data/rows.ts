// Builds `transactions` insert rows; transfers become two linked rows (one per account).
import { feeDescription } from "../domain/fees";
import type { DueEntry } from "../domain/schedule";
import type { ISODate, PaymentMethod, TransactionKind } from "../domain/types";

export interface NewTransaction {
  /** Explicit id, needed when another row (e.g. a fee) references this one. */
  id?: string;
  householdId: string;
  accountId: string;
  counterpartAccountId?: string | null;
  categoryId?: string | null;
  kind: Exclude<TransactionKind, "adjustment"> | "adjustment";
  /** Signed from the point of view of accountId. */
  amountCents: number;
  bookedOn: ISODate;
  description: string;
  notes?: string | null;
  status?: "booked" | "planned";
  source?: "manual" | "rule" | "contribution";
  recurringRuleId?: string | null;
  contributionRuleId?: string | null;
  occurrenceDate?: ISODate | null;
  createdBy?: string | null;
  paymentMethod?: PaymentMethod | null;
  parentTransactionId?: string | null;
}

export type TransactionInsert = Record<string, string | number | null>;

export function transactionRows(t: NewTransaction, newId: () => string = () => crypto.randomUUID()): TransactionInsert[] {
  const isTransfer = t.kind === "transfer" && !!t.counterpartAccountId;
  const group = isTransfer ? newId() : null;
  const base = {
    household_id: t.householdId,
    category_id: t.categoryId ?? null,
    kind: t.kind,
    status: t.status ?? "booked",
    source: t.source ?? "manual",
    booked_on: t.bookedOn,
    description: t.description,
    notes: t.notes ?? null,
    transfer_group_id: group,
    recurring_rule_id: t.recurringRuleId ?? null,
    contribution_rule_id: t.contributionRuleId ?? null,
    occurrence_date: t.occurrenceDate ?? null,
    created_by: t.createdBy ?? null,
    payment_method: t.paymentMethod ?? null,
    parent_transaction_id: t.parentTransactionId ?? null,
  };
  const rows: TransactionInsert[] = [
    { ...(t.id ? { id: t.id } : {}), ...base, account_id: t.accountId, counterpart_account_id: t.counterpartAccountId ?? null, amount_cents: t.amountCents },
  ];
  if (isTransfer) {
    rows.push({ ...base, account_id: t.counterpartAccountId!, counterpart_account_id: t.accountId, amount_cents: -t.amountCents });
  }
  return rows;
}

/**
 * Rows for a bonifico/CBill: the payment plus, when `feeCents` is set, a linked expense row
 * for the fee on the same account, date and status. Plain transactions pass through unchanged.
 * Both rows carry an explicit id: a bulk insert nulls keys missing from some rows instead of
 * applying column defaults.
 */
export function paymentRows(
  t: NewTransaction,
  feeCents: number | null,
  { feeCategoryId = null, newId = () => crypto.randomUUID() }: { feeCategoryId?: string | null; newId?: () => string } = {},
): TransactionInsert[] {
  if (!t.paymentMethod || !feeCents) return transactionRows(t, newId);
  const payment = { ...t, id: t.id ?? newId() };
  const fee = feeTransaction(payment, feeCents, feeCategoryId, newId());
  return [...transactionRows(payment, newId), ...transactionRows(fee, newId)];
}

/** Fee row of a saved payment: same account, date and status, linked by its id. */
export function feeTransaction(payment: NewTransaction & { id: string }, feeCents: number, feeCategoryId: string | null, id?: string): NewTransaction {
  return {
    id,
    householdId: payment.householdId,
    accountId: payment.accountId,
    categoryId: feeCategoryId,
    kind: "expense",
    amountCents: -Math.abs(feeCents),
    bookedOn: payment.bookedOn,
    description: feeDescription(payment.paymentMethod ?? "bank_transfer", payment.description),
    status: payment.status,
    source: payment.source,
    createdBy: payment.createdBy,
    parentTransactionId: payment.id,
  };
}

/** Transaction for a due entry (rule or contribution occurrence), optionally with the actual amount/date. */
export function entryTransaction(
  e: DueEntry,
  ctx: { householdId: string; userId: string | null },
  override: { amountCents?: number; bookedOn?: ISODate } = {},
): NewTransaction {
  return {
    householdId: ctx.householdId,
    accountId: e.accountId,
    counterpartAccountId: e.counterpartAccountId,
    categoryId: e.categoryId,
    kind: e.kind,
    amountCents: override.amountCents ?? e.amountCents,
    bookedOn: override.bookedOn ?? e.date,
    description: e.description,
    source: e.source === "rule" ? "rule" : "contribution",
    recurringRuleId: e.source === "rule" ? e.ruleId : null,
    contributionRuleId: e.source === "contribution" ? e.ruleId : null,
    occurrenceDate: e.occurrenceDate,
    createdBy: ctx.userId,
    paymentMethod: e.paymentMethod,
  };
}
