import type { TxnView } from "@/lib/data/views";
import type { TransactionDefaults } from "./TransactionForm";

/**
 * Edit form defaults of a saved movement. Transfers always read payer → receiver, even when
 * opened from the receiving account (whose row carries a positive amount).
 */
export function editDefaults(t: TxnView): TransactionDefaults {
  const incoming = t.isTransfer && t.amountCents > 0 && !!t.counterpartAccountId;
  return {
    kind: t.isTransfer ? "transfer" : (t.paymentMethod ?? (t.amountCents >= 0 ? "income" : "expense")),
    feeCents: t.feeCents,
    accountId: incoming ? t.counterpartAccountId! : t.accountId,
    accountName: incoming ? t.counterpartName : t.accountName,
    counterpartAccountId: incoming ? t.accountId : t.counterpartAccountId,
    counterpartName: incoming ? t.accountName : t.counterpartName,
    categoryId: t.categoryId,
    amountCents: Math.abs(t.amountCents),
    bookedOn: t.bookedOn,
    description: t.description,
    notes: t.notes,
    planned: t.status === "planned",
  };
}
