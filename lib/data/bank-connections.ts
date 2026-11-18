import "server-only";
import { cache } from "react";
import { mapBankConnection, type BankConnection } from "../banking/connections";
import { createClient } from "../supabase/server";
import { getUser } from "./context";

/** The caller's bank consents with their accounts (RLS: own rows, sealed columns not granted). */
export const listMyBankConnections = cache(async (): Promise<BankConnection[]> => {
  const user = await getUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bank_connections")
    .select("id, aspsp_name, valid_until, status, created_at, last_synced_at, bank_accounts(id, name, iban_masked, currency, account_id)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapBankConnection);
});
