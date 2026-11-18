"use server";

import { refresh } from "next/cache";
import { prepareBankCredentials } from "@/lib/banking/credentials";
import { masterKeyFromEnv } from "@/lib/banking/secrets";
import { getContext } from "@/lib/data/context";
import { parseBankCredentialsForm } from "@/lib/forms/bank-credentials";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, dbErrorMessage, failure, success } from "./state";

/**
 * Saves the caller's own Enable Banking application after checking id and key against the API.
 * The key is sealed before the write; the service role is needed because the table has no policies.
 */
export async function saveBankCredentials(prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseBankCredentialsForm(fd);
  if (!parsed.ok) return failure("Controlla i campi evidenziati.", parsed.errors);
  const ctx = await getContext();

  let masterKey: Buffer;
  try {
    masterKey = masterKeyFromEnv();
  } catch {
    console.error("[banking] BANK_KEYS_SECRET missing or invalid");
    return failure("Il collegamento alle banche non è ancora configurato sul server.");
  }

  const prepared = await prepareBankCredentials({ userId: ctx.userId, ...parsed.value }, { masterKey });
  if (!prepared.ok) return failure(prepared.message);

  const { error } = await createAdminClient()
    .from("bank_credentials")
    .upsert({ ...prepared.row, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return failure(dbErrorMessage(error));
  refresh();
  const env = prepared.row.environment === "sandbox" ? "di prova (Sandbox)" : "di produzione";
  return success(`App ${env} verificata e salvata.`, prev);
}

/** Removes the caller's application and its key. */
export async function deleteBankCredentials(): Promise<ActionState> {
  await getContext();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_my_bank_credentials");
  if (error) return failure(dbErrorMessage(error));
  refresh();
  return data ? success("App rimossa: la chiave è stata cancellata.") : failure("Nessuna app da rimuovere.");
}
