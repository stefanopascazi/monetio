"use server";

import { refresh } from "next/cache";
import { loadAgenda } from "@/lib/data/agenda";
import { getContext } from "@/lib/data/context";
import { parseOverrideForm, parseRuleKey } from "@/lib/forms/override";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, dbErrorMessage, failure, success } from "./state";

/** Saves the actual amount and due date of one rule occurrence (e.g. when the bill arrives). */
export async function setOccurrenceAmount(key: string, prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await getContext();
  const ref = parseRuleKey(key);
  if (!ref) return failure("Scadenza non valida.");
  const agenda = await loadAgenda();
  const entry = agenda.due.find((e) => e.key === key);
  if (!entry) return failure("Scadenza non trovata o già pagata.");
  const parsed = parseOverrideForm(fd);
  if (!parsed.ok) return failure("Controlla i campi evidenziati.", parsed.errors);
  const rule = agenda.rules.find((r) => r.id === ref.ruleId);
  const sign = Math.sign(rule?.amountCents ?? entry.amountCents) || -1;

  const supabase = await createClient();
  const { error } = await supabase.from("rule_occurrence_overrides").upsert(
    {
      household_id: ctx.householdId,
      rule_id: ref.ruleId,
      period: ref.period,
      amount_cents: sign * parsed.value.amountCents,
      due_date: parsed.value.dueDate,
      note: parsed.value.note,
      created_by: ctx.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "rule_id,period" },
  );
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success(`${entry.description}: importo reale salvato.`, prev);
}

/** Removes the actual amount, going back to the rule's estimate. */
export async function clearOccurrenceAmount(key: string): Promise<ActionState> {
  await getContext();
  const ref = parseRuleKey(key);
  if (!ref) return failure("Scadenza non valida.");
  const supabase = await createClient();
  const { error } = await supabase.from("rule_occurrence_overrides").delete().eq("rule_id", ref.ruleId).eq("period", ref.period);
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return success("Tornato all'importo stimato.");
}
