import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { feeDescription, feeSync } from "../domain/fees";
import type { PaymentMethod } from "../domain/types";
import { fetchFeeCategoryId } from "./fee-category";
import { feeTransaction, type NewTransaction, transactionRows } from "./rows";

export type SavedPayment = NewTransaction & { id: string; paymentMethod: PaymentMethod | null };

/**
 * Creates, updates or removes the fee row of an edited payment; the fee follows its account,
 * date and status. Returns the first database error, if any.
 */
export async function syncFee(client: SupabaseClient, payment: SavedPayment, feeCents: number | null) {
  const { data: fees, error } = await client.from("transactions").select("id").eq("parent_transaction_id", payment.id);
  if (error) return error;
  const cents = payment.paymentMethod ? feeCents : null;
  switch (feeSync(!!fees?.length, cents)) {
    case "insert": {
      const fee = feeTransaction(payment, cents!, await fetchFeeCategoryId(client, payment.householdId), crypto.randomUUID());
      return (await client.from("transactions").insert(transactionRows(fee))).error;
    }
    case "update": {
      const patch = {
        account_id: payment.accountId,
        booked_on: payment.bookedOn,
        status: payment.status,
        amount_cents: -cents!,
        description: feeDescription(payment.paymentMethod!, payment.description),
      };
      return (await client.from("transactions").update(patch).eq("parent_transaction_id", payment.id)).error;
    }
    case "delete":
      return (await client.from("transactions").delete().eq("parent_transaction_id", payment.id)).error;
    default:
      return null;
  }
}
