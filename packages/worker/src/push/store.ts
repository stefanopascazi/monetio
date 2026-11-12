import type { Sql } from "postgres";
import type { OutboxRow, PushStore, PushSubscriptionRow } from "./types.ts";

/** Rows failing this many times, or older than this, are abandoned (kept until purged). */
export const MAX_ATTEMPTS = 5;
export const MAX_AGE_HOURS = 24;

export function createPostgresPushStore(sql: Sql): PushStore {
  return {
    async pending(limit) {
      return sql<OutboxRow[]>`
        select id, user_id as "userId", title, body, url, tag from push_outbox
        where sent_at is null and attempts < ${MAX_ATTEMPTS}
          and created_at > now() - make_interval(hours => ${MAX_AGE_HOURS})
        order by created_at limit ${limit}`;
    },
    async subscriptionsFor(userIds) {
      if (userIds.length === 0) return [];
      return sql<PushSubscriptionRow[]>`
        select id, user_id as "userId", endpoint, p256dh, auth from push_subscriptions
        where user_id in ${sql(userIds)}`;
    },
    async markSent(id, note) {
      await sql`update push_outbox set sent_at = now(), last_error = ${note} where id = ${id}`;
    },
    async markFailed(id, error) {
      await sql`update push_outbox set attempts = attempts + 1, last_error = ${error.slice(0, 500)} where id = ${id}`;
    },
    async deleteSubscription(id) {
      await sql`delete from push_subscriptions where id = ${id}`;
    },
    async touchSubscription(id) {
      await sql`update push_subscriptions set last_success_at = now() where id = ${id}`;
    },
    async purge(before) {
      const rows = await sql`
        delete from push_outbox where created_at < ${before}
          and (sent_at is not null or attempts >= ${MAX_ATTEMPTS} or created_at < now() - make_interval(hours => ${MAX_AGE_HOURS}))`;
      return rows.count;
    },
  };
}
