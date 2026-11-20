// Bank account row read for the first-sync preview, turned into a sync target.
import type { ISODate } from "../../domain/types.ts";
import type { SyncTarget } from "./run.ts";

export type PendingRow = {
  id: string;
  uid: string;
  account_id: string;
  conn: { user_id: string; household_id: string; created_at: string; status: string; valid_until: string };
  account: { opening_date: string; archived_at: string | null };
};

/** Only an active consent on a live account can be previewed. */
export function pendingTarget(row: PendingRow, now: Date): SyncTarget | null {
  if (row.conn.status !== "active" || Date.parse(row.conn.valid_until) <= now.getTime() || row.account.archived_at) return null;
  return {
    bankAccountId: row.id,
    uid: row.uid,
    userId: row.conn.user_id,
    householdId: row.conn.household_id,
    accountId: row.account_id,
    openingDate: row.account.opening_date.slice(0, 10) as ISODate,
    syncFrom: null,
    lastSyncedAt: null,
    connectionCreatedAt: new Date(row.conn.created_at),
  };
}
