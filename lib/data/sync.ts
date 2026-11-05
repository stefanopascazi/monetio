import "server-only";
import { addDays } from "../domain/dates";
import { autoBookings, bookedOccurrences } from "../domain/schedule";
import { createClient } from "../supabase/server";
import type { AppContext } from "./context";
import { listBookedOccurrences, listRules } from "./queries";
import { entryTransaction, transactionRows } from "./rows";

/** How far back missed automatic occurrences are still booked. */
const CATCH_UP_DAYS = 120;

/**
 * Books automatic recurring items whose date has passed. Idempotent: the unique
 * (rule, occurrence, account) index rejects duplicates, which are skipped.
 */
export async function syncAutoRules(ctx: AppContext, today: string): Promise<number> {
  const since = addDays(today, -CATCH_UP_DAYS);
  const [rules, occ] = await Promise.all([listRules(), listBookedOccurrences(since)]);
  const pending = autoBookings(rules, bookedOccurrences(occ, rules), today, since);
  if (!pending.length) return 0;
  const supabase = await createClient();
  let booked = 0;
  for (const e of pending) {
    const { error } = await supabase.from("transactions").insert(transactionRows(entryTransaction(e, { householdId: ctx.householdId, userId: ctx.userId })));
    if (!error) booked++;
    else if (error.code !== "23505") throw error;
  }
  return booked;
}
