import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "../domain/dates";
import { autoBookings, bookedOccurrences } from "../domain/schedule";
import { createClient } from "../supabase/server";
import type { AppContext } from "./context";
import { mapRule } from "./mappers";
import { listBookedOccurrences, listRules } from "./queries";
import { entryTransaction, transactionRows } from "./rows";
import type { DueEntry } from "../domain/schedule";

/** How far back missed automatic occurrences are still booked. */
export const CATCH_UP_DAYS = 120;

/** Inserts bookings one by one; duplicates (unique occurrence index) are skipped. */
async function insertBookings(client: SupabaseClient, entries: DueEntry[], householdId: string, userId: string | null): Promise<number> {
  let booked = 0;
  for (const e of entries) {
    const { error } = await client.from("transactions").insert(transactionRows(entryTransaction(e, { householdId, userId })));
    if (!error) booked++;
    else if (error.code !== "23505") throw error;
  }
  return booked;
}

/** Books passed automatic rules visible to the signed-in user (runs on page load). */
export async function syncAutoRules(ctx: AppContext, today: string): Promise<number> {
  const since = addDays(today, -CATCH_UP_DAYS);
  const [rules, occ] = await Promise.all([listRules(), listBookedOccurrences(since)]);
  const pending = autoBookings(rules, bookedOccurrences(occ, rules), today, since);
  if (!pending.length) return 0;
  // Automatic bookings are not entered by anyone: no creator, same as the daily cron.
  return insertBookings(await createClient(), pending, ctx.householdId, null);
}

/** Books passed automatic rules of a whole household with a service-role client (daily cron). */
export async function syncHousehold(admin: SupabaseClient, householdId: string, today: string): Promise<number> {
  const since = addDays(today, -CATCH_UP_DAYS);
  const [{ data: ruleRows, error: rulesError }, { data: occRows, error: occError }] = await Promise.all([
    admin.from("recurring_rules").select("*").eq("household_id", householdId).eq("active", true).eq("schedule", "auto"),
    admin
      .from("transactions")
      .select("recurring_rule_id, contribution_rule_id, occurrence_date")
      .eq("household_id", householdId)
      .gte("occurrence_date", since)
      .not("recurring_rule_id", "is", null)
      .limit(5000),
  ]);
  if (rulesError) throw rulesError;
  if (occError) throw occError;
  const rules = (ruleRows ?? []).map(mapRule);
  const occ = (occRows ?? []).map((r) => ({
    recurringRuleId: r.recurring_rule_id as string | null,
    contributionRuleId: r.contribution_rule_id as string | null,
    occurrenceDate: r.occurrence_date as string | null,
  }));
  const pending = autoBookings(rules, bookedOccurrences(occ, rules), today, since);
  return pending.length ? insertBookings(admin, pending, householdId, null) : 0;
}
