"use server";

import { refresh } from "next/cache";
import { todayISO } from "@/lib/domain/dates";
import { feeSource } from "@/lib/domain/fees";
import { loadAgenda } from "@/lib/data/agenda";
import { getContext } from "@/lib/data/context";
import { fetchFeeCategoryId } from "@/lib/data/fee-category";
import { entryTransaction, paymentRows } from "@/lib/data/rows";
import { parseContributionForm } from "@/lib/forms/contribution";
import { isISODate, isUUID, positiveCents } from "@/lib/forms/parse";
import { feeFromForm } from "@/lib/forms/payment";
import { parseRuleForm } from "@/lib/forms/rule";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, dbErrorMessage, failure, success } from "./state";

function ruleRow(v: ReturnType<typeof parseRuleForm> & { ok: true }) {
  const r = v.value;
  return {
    account_id: r.accountId,
    counterpart_account_id: r.counterpartAccountId,
    category_id: r.categoryId,
    kind: r.kind,
    description: r.description,
    amount_cents: r.amountCents,
    frequency: r.frequency,
    schedule: r.schedule,
    day_of_month: r.dayOfMonth,
    start_date: r.startDate,
    end_date: r.endDate,
    active: r.active,
    payment_method: r.paymentMethod,
    fee_cents: feeSource(r.kind, r.paymentMethod) ? r.feeCents : 0,
  };
}

export async function createRule(prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await getContext();
  const parsed = parseRuleForm(fd);
  if (!parsed.ok) return failure("Controlla i campi evidenziati.", parsed.errors);
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_rules").insert({ household_id: ctx.householdId, ...ruleRow(parsed) });
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success("Ricorrenza aggiunta.", prev);
}

export async function updateRule(id: string, prev: ActionState, fd: FormData): Promise<ActionState> {
  if (!isUUID(id)) return failure("Ricorrenza non trovata.");
  await getContext();
  const parsed = parseRuleForm(fd);
  if (!parsed.ok) return failure("Controlla i campi evidenziati.", parsed.errors);
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_rules").update(ruleRow(parsed)).eq("id", id);
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success("Ricorrenza aggiornata.", prev);
}

export async function deleteRule(id: string): Promise<ActionState> {
  if (!isUUID(id)) return failure("Ricorrenza non trovata.");
  await getContext();
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_rules").delete().eq("id", id);
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success("Ricorrenza eliminata.");
}

function contributionRow(v: ReturnType<typeof parseContributionForm> & { ok: true }) {
  const c = v.value;
  return {
    from_account_id: c.fromAccountId,
    to_account_id: c.toAccountId,
    description: c.description,
    fixed_cents: c.fixedCents,
    share_percent: c.sharePercent,
    category_ids: c.categoryIds,
    day_of_month: c.dayOfMonth,
    estimated_spending_cents: c.estimatedSpendingCents,
    spending_account_id: c.spendingAccountId,
    spending_month_offset: c.spendingMonthOffset,
    rounding_cents: c.roundingCents,
    active: c.active,
  };
}

export async function createContribution(prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await getContext();
  const parsed = parseContributionForm(fd);
  if (!parsed.ok) return failure("Controlla i campi evidenziati.", parsed.errors);
  const supabase = await createClient();
  const { error } = await supabase.from("contribution_rules").insert({ household_id: ctx.householdId, start_date: todayISO(), ...contributionRow(parsed) });
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success("Quota aggiunta.", prev);
}

export async function updateContribution(id: string, prev: ActionState, fd: FormData): Promise<ActionState> {
  if (!isUUID(id)) return failure("Quota non trovata.");
  await getContext();
  const parsed = parseContributionForm(fd);
  if (!parsed.ok) return failure("Controlla i campi evidenziati.", parsed.errors);
  const supabase = await createClient();
  const { error } = await supabase.from("contribution_rules").update(contributionRow(parsed)).eq("id", id);
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success("Quota aggiornata.", prev);
}

export async function deleteContribution(id: string): Promise<ActionState> {
  if (!isUUID(id)) return failure("Quota non trovata.");
  await getContext();
  const supabase = await createClient();
  const { error } = await supabase.from("contribution_rules").delete().eq("id", id);
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success("Quota eliminata.");
}

/**
 * Books a deadline (due rule or contribution). The entry is recomputed on the server;
 * the form can only override the actual amount and payment date.
 */
export async function markEntryPaid(key: string, prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await getContext();
  const agenda = await loadAgenda();
  const entry = agenda.due.find((e) => e.key === key);
  if (!entry) return failure("Scadenza non trovata o già registrata.");
  const cents = fd.get("amountCents") ? positiveCents(String(fd.get("amountCents"))) : Math.abs(entry.amountCents);
  const date = String(fd.get("bookedOn") ?? "") || todayISO();
  if (cents === null) return failure("Inserisci un importo maggiore di zero.", { amountCents: "Importo non valido" });
  if (!isISODate(date)) return failure("Inserisci una data valida.", { bookedOn: "Data non valida" });
  // Bonifico/CBill/transfer rules: the fee can be corrected on payment (empty = none).
  const feeCents = entry.source === "rule" && feeSource(entry.kind, entry.paymentMethod) ? (fd.has("feeCents") ? feeFromForm(fd) : entry.feeCents) : 0;
  if (feeCents === undefined) return failure("Controlla i campi evidenziati.", { feeCents: "Le spese devono essere maggiori di zero" });
  const signed = Math.sign(entry.amountCents || -1) * cents;
  const supabase = await createClient();
  const feeCategoryId = feeCents ? await fetchFeeCategoryId(supabase, ctx.householdId) : null;
  const payment = entryTransaction(entry, { householdId: ctx.householdId, userId: ctx.userId }, { amountCents: signed, bookedOn: date });
  const { error } = await supabase.from("transactions").insert(paymentRows(payment, feeCents, { feeCategoryId }));
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success(`${entry.description}: registrato.`, prev);
}
