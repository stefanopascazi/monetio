import type { Sql } from "postgres";
import type { OutboxInsert } from "../jobs/notify-events.ts";

/** Inserts notification rows (service role), ignoring dedup keys already queued; returns new rows. */
export function createOutboxWriter(sql: Sql) {
  return async (rows: OutboxInsert[]): Promise<number> => {
    if (!rows.length) return 0;
    const values = rows.map((r) => ({
      user_id: r.userId,
      household_id: r.householdId,
      kind: r.event.kind,
      title: r.event.title,
      body: r.event.body,
      url: r.event.url,
      dedup_key: r.event.dedupKey,
      push_after: r.pushAfter,
      sent_at: r.pushMuted ? new Date() : null,
      last_error: r.pushMuted ? "push muted" : null,
    }));
    const result = await sql`insert into push_outbox ${sql(values)} on conflict (dedup_key) do nothing`;
    return result.count;
  };
}
