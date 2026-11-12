import type { OutboxRow, PushSender, PushStore, PushSubscriptionRow } from "../push/types.ts";
import type { Job, JobContext } from "./types.ts";

const BATCH = 100;
const RETENTION_DAYS = 30;

/** Delivers queued notifications every minute and drops expired subscriptions (404/410). */
export function createPushDeliverJob(store: PushStore, sender: PushSender): Job {
  return {
    name: "push-deliver",
    intervalMs: 60_000,
    timeoutMs: 120_000,
    async run(ctx) {
      const rows = await store.pending(BATCH);
      if (rows.length > 0) {
        const subs = await store.subscriptionsFor([...new Set(rows.map((r) => r.userId))]);
        const gone = new Set<string>();
        for (const row of rows) {
          ctx.signal.throwIfAborted();
          const live = subs.filter((s) => s.userId === row.userId && !gone.has(s.id));
          await deliver(row, live, store, sender, ctx, gone);
        }
      }
      const purged = await store.purge(new Date(ctx.now.getTime() - RETENTION_DAYS * 86_400_000));
      if (rows.length > 0 || purged > 0) ctx.log("info", "push delivered", { rows: rows.length, purged });
    },
  };
}

export function pushServiceHost(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return "invalid";
  }
}

async function deliver(row: OutboxRow, subs: PushSubscriptionRow[], store: PushStore, sender: PushSender, ctx: JobContext, gone: Set<string>) {
  if (subs.length === 0) return store.markSent(row.id, "no subscription");
  const payload = { title: row.title, body: row.body, url: row.url, ...(row.tag ? { tag: row.tag } : {}) };
  let sent = 0;
  const errors: string[] = [];
  for (const sub of subs) {
    const result = await sender.send(sub, payload, ctx.signal);
    // Push service host only: endpoints are bearer URLs.
    const fields = { outbox: row.id, subscription: sub.id, service: pushServiceHost(sub.endpoint) };
    if (result.status === "sent") {
      sent++;
      ctx.log("info", "push sent", fields);
      await store.touchSubscription(sub.id);
    } else if (result.status === "gone") {
      gone.add(sub.id);
      ctx.log("info", "push subscription expired", fields);
      await store.deleteSubscription(sub.id);
    } else {
      errors.push(result.message);
      ctx.log("warn", "push failed", { ...fields, error: result.message });
    }
  }
  // Retry only when nothing reached the user and some failure is transient.
  if (sent === 0 && errors.length > 0) return store.markFailed(row.id, errors[0]);
  return store.markSent(row.id, sent === 0 ? "all subscriptions expired" : null);
}
