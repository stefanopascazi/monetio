import "server-only";
import { cache } from "react";
import { mapBankConnection, type BankConnection } from "../banking/connections";
import { createClient } from "../supabase/server";
import { getContext } from "./context";

/** The caller's bank consents in the active household, with their accounts (RLS: own rows, sealed columns not granted). */
export const listMyBankConnections = cache(async (): Promise<BankConnection[]> => {
  const { userId, householdId } = await getContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bank_connections")
    .select(
      "id, aspsp_name, valid_until, status, created_at, last_synced_at, bank_accounts(id, name, iban_masked, currency, account_id, bank_balance_cents, bank_balance_on, last_synced_at, last_error, sync_confirmed_at, sync_from, sync_slots)",
    )
    .eq("user_id", userId)
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapBankConnection);
});

/** Day of the latest booked movement of each account, the default start of a first-sync preview. */
export async function lastBookedOnByAccount(accountIds: string[]): Promise<Record<string, string>> {
  if (!accountIds.length) return {};
  const supabase = await createClient();
  const rows = await Promise.all(
    accountIds.map(async (id) => {
      const { data, error } = await supabase
        .from("transactions")
        .select("booked_on")
        .eq("account_id", id)
        .eq("status", "booked")
        .order("booked_on", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return [id, data?.booked_on as string | undefined] as const;
    }),
  );
  return Object.fromEntries(rows.filter((r): r is readonly [string, string] => !!r[1]));
}
