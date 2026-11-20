import "server-only";
import { createAdminClient } from "../supabase/admin";
import { createBankService, type BankStore } from "./bank-service";
import { createEnableBankingClient } from "./enable-banking/client";
import { masterKeyFromEnv } from "./secrets";
import { type PendingRow, pendingTarget } from "./sync/pending";

/** Service-role store: the bank tables have no write policies and hide sealed columns. */
function supabaseBankStore(): BankStore {
  const admin = createAdminClient();
  return {
    async loadCredentials(userId) {
      const { data, error } = await admin.from("bank_credentials").select("app_id, private_key_sealed").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
    async insertConnection(row, accounts) {
      const { data, error } = await admin.from("bank_connections").insert(row).select("id").single();
      if (error) throw error;
      if (!accounts.length) return;
      const { error: accError } = await admin.from("bank_accounts").insert(accounts.map((a) => ({ ...a, connection_id: data.id })));
      if (accError) {
        // Keep the two writes together: a consent without its accounts would be useless.
        await admin.from("bank_connections").delete().eq("id", data.id);
        throw accError;
      }
    },
    async loadConnection(id, userId) {
      const { data, error } = await admin.from("bank_connections").select("id, session_id_sealed").eq("id", id).eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
    async deleteConnection(id) {
      const { error } = await admin.from("bank_connections").delete().eq("id", id);
      if (error) throw error;
    },
    async loadPendingSyncTarget(userId, bankAccountId) {
      const { data, error } = await admin
        .from("bank_accounts")
        .select("id, uid, account_id, conn:bank_connections!inner(user_id, household_id, created_at, status, valid_until), account:accounts!inner(opening_date, archived_at)")
        .eq("id", bankAccountId)
        .eq("conn.user_id", userId)
        .is("sync_confirmed_at", null)
        .not("account_id", "is", null)
        .maybeSingle();
      if (error) throw error;
      const row = data as unknown as PendingRow | null;
      return row ? pendingTarget(row, new Date()) : null;
    },
  };
}

/** Throws when BANK_KEYS_SECRET is missing: callers turn it into a "not configured" message. */
export function bankService() {
  return createBankService({ masterKey: masterKeyFromEnv(), store: supabaseBankStore(), createClient: createEnableBankingClient });
}

export const BANK_STATE_COOKIE = "mio_bank_state";
