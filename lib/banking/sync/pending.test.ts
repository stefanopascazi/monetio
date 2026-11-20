import { describe, expect, it } from "vitest";
import { type PendingRow, pendingTarget } from "./pending";

const row: PendingRow = {
  id: "ba1",
  uid: "u1",
  account_id: "acc1",
  conn: { user_id: "user-1", household_id: "h1", created_at: "2026-11-19T07:00:00Z", status: "active", valid_until: "2027-05-01T00:00:00Z" },
  account: { opening_date: "2024-01-01", archived_at: null },
};
const now = new Date("2026-11-20T08:00:00Z");

describe("pendingTarget", () => {
  it("maps an active, live account to a target that was never synced", () => {
    expect(pendingTarget(row, now)).toEqual({
      bankAccountId: "ba1",
      uid: "u1",
      userId: "user-1",
      householdId: "h1",
      accountId: "acc1",
      openingDate: "2024-01-01",
      syncFrom: null,
      lastSyncedAt: null,
      connectionCreatedAt: new Date("2026-11-19T07:00:00Z"),
    });
  });

  it("refuses expired consents and archived accounts", () => {
    expect(pendingTarget({ ...row, conn: { ...row.conn, status: "expired" } }, now)).toBeNull();
    expect(pendingTarget({ ...row, conn: { ...row.conn, valid_until: "2026-11-01T00:00:00Z" } }, now)).toBeNull();
    expect(pendingTarget({ ...row, account: { ...row.account, archived_at: "2026-11-01T00:00:00Z" } }, now)).toBeNull();
  });
});
