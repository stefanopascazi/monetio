import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, todayISO } from "../domain/dates";
import { autoBookings, bookedOccurrences, overrideMap } from "../domain/schedule";
import { createClient } from "../supabase/server";
import type { AppContext } from "./context";
import { mapOverride, mapRule } from "./mappers";
import { listAccounts, listBookedOccurrences, listOverrides, listRules } from "./queries";
import { ownsRule } from "./rule-visibility";
import { fetchFeeCategoryId } from "./fee-category";
import { entryTransaction, paymentRows } from "./rows";
import type { DueEntry } from "../domain/schedule";

/** How far back missed automatic occurrences are still booked. */
export const CATCH_UP_DAYS = 120;

/**
 * Inserts bookings one by one; duplicates (unique occurrence index) are skipped.
 * Bonifico/CBill rules also book their fee as a linked row in the same insert.
 */
async function insertBookings(client: SupabaseClient, entries: DueEntry[], householdId: string, userId: string | null): Promise<number> {
  let booked = 0;
  const feeCategoryId = entries.some((e) => e.feeCents) ? await fetchFeeCategoryId(client, householdId) : null;
  for (const e of entries) {
    const { error } = await client.from("transactions").insert(paymentRows(entryTransaction(e, { householdId, userId }), e.feeCents, { feeCategoryId }));
    if (!error) booked++;
    else if (error.code !== "23505") throw error;
  }
  return booked;
}

/** Books passed automatic rules visible to the signed-in user (runs on page load). */
export async function syncAutoRules(ctx: AppContext, today: string): Promise<number> {
  const since = addDays(today, -CATCH_UP_DAYS);
  const [all, occ, accounts, overrides] = await Promise.all([listRules(), listBookedOccurrences(since), listAccounts(), listOverrides()]);
  // Rules seen only through their counterpart are booked by their owner or by the daily cron.
  const visible = new Set(accounts.map((a) => a.id));
  const rules = all.filter((r) => ownsRule(r, visible));
  const pending = autoBookings(rules, bookedOccurrences(occ, all), today, since, overrideMap(overrides));
  if (!pending.length) return 0;
  // Automatic bookings are not entered by anyone: no creator, same as the daily cron.
  return insertBookings(await createClient(), pending, ctx.householdId, null);
}

/** Books automatic occurrences already due (e.g. a rule starting in the past); the caller's save succeeds either way. */
export async function bookPassedOccurrences(ctx: AppContext): Promise<void> {
  try {
    await syncAutoRules(ctx, todayISO());
  } catch (e) {
    console.error("syncAutoRules failed", e instanceof Error ? e.message : e);
  }
}

/** Books passed automatic rules of a whole household with a service-role client (daily cron). */
export async function syncHousehold(admin: SupabaseClient, householdId: string, today: string): Promise<number> {
  const since = addDays(today, -CATCH_UP_DAYS);
  const [{ data: ruleRows, error: rulesError }, { data: occRows, error: occError }, { data: overrideRows, error: overridesError }] = await Promise.all([
    admin.from("recurring_rules").select("*").eq("household_id", householdId).eq("active", true).eq("schedule", "auto"),
    admin
      .from("transactions")
      .select("recurring_rule_id, contribution_rule_id, occurrence_date")
      .eq("household_id", householdId)
      .gte("occurrence_date", since)
      .not("recurring_rule_id", "is", null)
      .limit(5000),
    admin.from("rule_occurrence_overrides").select("rule_id, period, amount_cents, due_date, note").eq("household_id", householdId),
  ]);
  if (rulesError) throw rulesError;
  if (occError) throw occError;
  if (overridesError) throw overridesError;
  const rules = (ruleRows ?? []).map(mapRule);
  const occ = (occRows ?? []).map((r) => ({
    recurringRuleId: r.recurring_rule_id as string | null,
    contributionRuleId: r.contribution_rule_id as string | null,
    occurrenceDate: r.occurrence_date as string | null,
  }));
  const overrides = overrideMap((overrideRows ?? []).map(mapOverride));
  const pending = autoBookings(rules, bookedOccurrences(occ, rules), today, since, overrides);
  return pending.length ? insertBookings(admin, pending, householdId, null) : 0;
}

/**
 * Books the household's planned transactions dated today or earlier (daily cron).
 * Transfer legs and fee rows are planned rows with the same date, so they follow together.
 */
export async function bookDuePlanned(admin: SupabaseClient, householdId: string, today: string): Promise<number> {
  const { data, error } = await admin
    .from("transactions")
    .update({ status: "booked" })
    .eq("household_id", householdId)
    .eq("status", "planned")
    .lte("booked_on", today)
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}
