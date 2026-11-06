"use server";

import { refresh } from "next/cache";
import { todayISO } from "@/lib/domain/dates";
import { getContext } from "@/lib/data/context";
import { fetchFeeCategoryId } from "@/lib/data/fee-category";
import { syncFee } from "@/lib/data/fee-sync";
import { paymentRows } from "@/lib/data/rows";
import { parseTransactionForm } from "@/lib/forms/transaction";
import { isUUID } from "@/lib/forms/parse";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, dbErrorMessage, failure, success } from "./state";

const FEE_LOCKED = "Queste spese si gestiscono dal bonifico, CBill o giroconto a cui appartengono.";

export async function createTransaction(prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await getContext();
  const parsed = parseTransactionForm(fd, todayISO());
  if (!parsed.ok) return failure("Controlla i campi evidenziati.", parsed.errors);
  const v = parsed.value;
  const supabase = await createClient();
  // A bonifico/CBill/transfer with a fee also gets a linked expense row for the fee.
  const feeCategoryId = v.feeCents ? await fetchFeeCategoryId(supabase, ctx.householdId) : null;
  const { error } = await supabase.from("transactions").insert(
    paymentRows({ ...v, householdId: ctx.householdId, createdBy: ctx.userId }, v.feeCents, { feeCategoryId }),
  );
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success(v.status === "planned" ? "Movimento pianificato salvato." : "Movimento salvato.", prev);
}

export async function updateTransaction(id: string, prev: ActionState, fd: FormData): Promise<ActionState> {
  if (!isUUID(id)) return failure("Movimento non trovato.");
  const ctx = await getContext();
  const parsed = parseTransactionForm(fd, todayISO());
  if (!parsed.ok) return failure("Controlla i campi evidenziati.", parsed.errors);
  const v = parsed.value;
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("transactions")
    .select("id, kind, transfer_group_id, account_id, parent_transaction_id, source, created_by")
    .eq("id", id)
    .maybeSingle();
  if (!current) return failure("Movimento non trovato.");
  if (current.parent_transaction_id) return failure(FEE_LOCKED);

  const shared = { category_id: v.categoryId, booked_on: v.bookedOn, description: v.description, notes: v.notes, status: v.status };
  if (current.transfer_group_id) {
    // Keep both sides of a transfer in sync; account pair and direction stay as they were.
    const { data: sides } = await supabase
      .from("transactions")
      .select("id, account_id, amount_cents")
      .eq("transfer_group_id", current.transfer_group_id)
      .is("parent_transaction_id", null);
    for (const side of sides ?? []) {
      const amount = Number(side.amount_cents) < 0 ? -Math.abs(v.amountCents) : Math.abs(v.amountCents);
      const { error } = await supabase.from("transactions").update({ ...shared, amount_cents: amount }).eq("id", side.id);
      if (error) return failure(dbErrorMessage(error));
    }
    // The fee belongs to the paying side, whichever side was edited.
    const payer = sides?.find((s) => Number(s.amount_cents) < 0);
    if (payer) {
      const feeError = await syncFee(
        supabase,
        { ...v, id: String(payer.id), accountId: String(payer.account_id), paymentMethod: null, householdId: ctx.householdId, source: current.source, createdBy: current.created_by },
        v.feeCents,
      );
      if (feeError) return failure(dbErrorMessage(feeError));
    }
  } else {
    const { error } = await supabase
      .from("transactions")
      .update({
        ...shared,
        kind: v.kind === "transfer" ? current.kind : v.kind,
        account_id: v.accountId,
        amount_cents: v.amountCents,
        payment_method: v.paymentMethod,
      })
      .eq("id", id);
    if (error) return failure(dbErrorMessage(error));
    const feeError = await syncFee(supabase, { ...v, id, householdId: ctx.householdId, source: current.source, createdBy: current.created_by }, v.feeCents);
    if (feeError) return failure(dbErrorMessage(feeError));
  }
  refresh();
  return success("Modifiche salvate.", prev);
}

export async function deleteTransaction(id: string): Promise<ActionState> {
  if (!isUUID(id)) return failure("Movimento non trovato.");
  await getContext();
  const supabase = await createClient();
  const { data: current } = await supabase.from("transactions").select("transfer_group_id, parent_transaction_id").eq("id", id).maybeSingle();
  if (current?.parent_transaction_id) return failure(FEE_LOCKED);
  // Fee rows of a bonifico/CBill/transfer are removed by the FK cascade.
  const query = supabase.from("transactions").delete();
  const { error } = current?.transfer_group_id ? await query.eq("transfer_group_id", current.transfer_group_id) : await query.eq("id", id);
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success("Movimento eliminato.");
}

/** Turns a planned transaction into a booked one, dated today unless it is already past. */
export async function confirmPlanned(id: string): Promise<ActionState> {
  if (!isUUID(id)) return failure("Movimento non trovato.");
  await getContext();
  const supabase = await createClient();
  const { data: t } = await supabase.from("transactions").select("booked_on, transfer_group_id, parent_transaction_id").eq("id", id).maybeSingle();
  if (!t) return failure("Movimento non trovato.");
  if (t.parent_transaction_id) return failure(FEE_LOCKED);
  const today = todayISO();
  const patch = { status: "booked", booked_on: t.booked_on > today ? today : t.booked_on };
  const q = supabase.from("transactions").update(patch);
  const { error } = t.transfer_group_id ? await q.eq("transfer_group_id", t.transfer_group_id) : await q.eq("id", id);
  if (error) return failure(dbErrorMessage(error));
  // Confirm the fee together with it; a transfer's fee hangs on its paying side.
  const parents = t.transfer_group_id ? ((await supabase.from("transactions").select("id").eq("transfer_group_id", t.transfer_group_id)).data ?? []).map((r) => String(r.id)) : [id];
  const { error: feeError } = await supabase.from("transactions").update(patch).in("parent_transaction_id", parents);
  if (feeError) return failure(dbErrorMessage(feeError));
  refresh();
  return success("Movimento registrato.");
}
