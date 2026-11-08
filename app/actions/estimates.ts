"use server";

import { refresh } from "next/cache";
import { todayISO } from "@/lib/domain/dates";
import { occurrenceOfPeriod } from "@/lib/domain/estimates";
import { loadAgenda } from "@/lib/data/agenda";
import { getContext } from "@/lib/data/context";
import { transactionRows } from "@/lib/data/rows";
import { parseEstimateBookingForm } from "@/lib/forms/estimate";
import { parseRuleKey } from "@/lib/forms/override";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, dbErrorMessage, failure, success } from "./state";

/** Estimate rule and scheduled date of an occurrence key, unless already booked. */
async function estimateOccurrence(key: string) {
  const ref = parseRuleKey(key);
  if (!ref) return null;
  const agenda = await loadAgenda();
  const rule = agenda.rules.find((r) => r.id === ref.ruleId && r.schedule === "estimate");
  const date = rule ? occurrenceOfPeriod(rule, ref.period) : null;
  if (!rule || !date || agenda.booked.has(key)) return null;
  return { rule, date, period: ref.period };
}

/** Turns what is left of an estimate into a booked movement, with the amount entered by the user. */
export async function bookEstimate(key: string, prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await getContext();
  const today = todayISO();
  const occ = await estimateOccurrence(key);
  if (!occ) return failure("Stima non trovata o già registrata.");
  const parsed = parseEstimateBookingForm(fd, today);
  if (!parsed.ok) return failure("Controlla i campi evidenziati.", parsed.errors);
  const { rule, date } = occ;
  const supabase = await createClient();
  const rows = transactionRows({
    householdId: ctx.householdId,
    accountId: rule.accountId,
    counterpartAccountId: rule.kind === "transfer" ? rule.counterpartAccountId : null,
    categoryId: rule.categoryId,
    kind: rule.kind,
    amountCents: (Math.sign(rule.amountCents) || -1) * parsed.value.amountCents,
    bookedOn: parsed.value.bookedOn,
    description: rule.description,
    source: "rule",
    recurringRuleId: rule.id,
    occurrenceDate: date,
    createdBy: ctx.userId,
    // It replaces the estimate: it must not reduce other decreasing estimates as well.
    skipEstimates: true,
  });
  const { error } = await supabase.from("transactions").insert(rows);
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success(`${rule.description}: registrato.`, prev);
}

/** Drops what is left of an estimate for its period: it no longer counts in the month. */
export async function closeEstimate(key: string): Promise<ActionState> {
  const ctx = await getContext();
  const occ = await estimateOccurrence(key);
  if (!occ) return failure("Stima non trovata o già registrata.");
  const supabase = await createClient();
  // A zero override marks the occurrence as closed (see projectedMovements).
  const { error } = await supabase.from("rule_occurrence_overrides").upsert(
    {
      household_id: ctx.householdId,
      rule_id: occ.rule.id,
      period: occ.period,
      amount_cents: 0,
      due_date: occ.date,
      note: "Stima chiusa",
      created_by: ctx.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "rule_id,period" },
  );
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success(`${occ.rule.description}: stima eliminata per questo periodo.`);
}
