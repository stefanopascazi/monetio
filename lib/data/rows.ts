// Builds `transactions` insert rows; transfers become two linked rows (one per account).
import type { DueEntry } from "../domain/schedule";
import type { ISODate, TransactionKind } from "../domain/types";

export interface NewTransaction {
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
  };
  const rows: TransactionInsert[] = [
    { ...base, account_id: t.accountId, counterpart_account_id: t.counterpartAccountId ?? null, amount_cents: t.amountCents },
  ];
  if (isTransfer) {
    rows.push({ ...base, account_id: t.counterpartAccountId!, counterpart_account_id: t.accountId, amount_cents: -t.amountCents });
  }
  return rows;
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
  };
}
