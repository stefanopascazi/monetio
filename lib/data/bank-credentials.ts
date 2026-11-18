import "server-only";
import { cache } from "react";
import { mapBankApp, type BankApp } from "../banking/bank-app";
import { createClient } from "../supabase/server";
import { getUser } from "./context";

/** The caller's Enable Banking application, without its key; null when not set up. */
export const getMyBankApp = cache(async (): Promise<BankApp | null> => {
  await getUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_bank_credentials");
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  return row ? mapBankApp(row) : null;
});
