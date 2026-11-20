import "server-only";
import { type BankSyncBatch, mapBankSyncBatch, RECENT_BATCHES } from "../banking/sync-batches";
import { createClient } from "../supabase/server";

/** Latest sync batches of each account (RLS: visible accounts), newest first. */
export async function listRecentBankSyncBatches(accountIds: string[]): Promise<Record<string, BankSyncBatch[]>> {
  if (!accountIds.length) return {};
  const supabase = await createClient();
  const rows = await Promise.all(
    accountIds.map(async (id) => {
      const { data, error } = await supabase
        .from("bank_sync_batches")
        .select("id, account_id, kind, inserted, reconciled, review, created_at, undone_at")
        .eq("account_id", id)
        .order("created_at", { ascending: false })
        .limit(RECENT_BATCHES);
      if (error) throw error;
      return [id, (data ?? []).map(mapBankSyncBatch)] as const;
    }),
  );
  return Object.fromEntries(rows.filter((r) => r[1].length));
}
