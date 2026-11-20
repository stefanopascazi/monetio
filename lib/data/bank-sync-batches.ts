import "server-only";
import { type BankSyncBatch, type BankSyncBatchDetail, mapBankSyncBatch, mapBatchDetail, RECENT_BATCHES } from "../banking/sync-batches";
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

/** Movements a batch inserted, changed and queued (RLS: visible accounts). */
export async function getBankSyncBatchDetail(batchId: string): Promise<BankSyncBatchDetail> {
  const supabase = await createClient();
  const [inserted, changes, reviews] = await Promise.all([
    supabase.from("transactions").select("id, booked_on, amount_cents, description").eq("bank_sync_batch_id", batchId).order("booked_on"),
    supabase
      .from("bank_sync_batch_changes")
      .select("prev_amount_cents, prev_booked_on, prev_status, transaction:transactions(id, booked_on, amount_cents, description, status, parent_transaction_id)")
      .eq("batch_id", batchId),
    supabase.from("bank_sync_reviews").select("id, booked_on, amount_cents, description, reason, resolution").eq("batch_id", batchId).order("booked_on"),
  ]);
  const error = inserted.error ?? changes.error ?? reviews.error;
  if (error) throw error;
  const detail = mapBatchDetail({
    inserted: inserted.data ?? [],
    changes: (changes.data ?? []) as unknown as Parameters<typeof mapBatchDetail>[0]["changes"],
    reviews: reviews.data ?? [],
  });
  detail.reconciled.sort((a, b) => a.bookedOn.localeCompare(b.bookedOn));
  return detail;
}
