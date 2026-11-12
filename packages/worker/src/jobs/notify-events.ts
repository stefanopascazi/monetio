import { todayISO } from "../../../../lib/domain/dates.ts";
import { type EventSnapshot, type NotificationEvent, selectEvents } from "../../../../lib/notifications/events.ts";
import type { NotificationPrefs } from "../../../../lib/notifications/prefs.ts";
import { pushAfter } from "../../../../lib/notifications/quiet-hours.ts";
import { errorMessage } from "../logger.ts";
import type { Recipient } from "../notify/snapshot.ts";
import { isSchemaNotReady } from "../schema.ts";
import { dailyDue } from "./schedule.ts";
import type { Job } from "./types.ts";

/** 07:00 UTC = 08:00 Rome in winter, 09:00 in summer. */
export const NOTIFY_HOUR_UTC = 7;

/** An outbox row to insert; a repeated dedup key is ignored by the database. */
export interface OutboxInsert {
  userId: string;
  householdId: string;
  event: NotificationEvent;
  /** When push may go out (quiet hours). */
  pushAfter: Date;
  /** Push muted for this kind: the row only reaches the bell. */
  pushMuted: boolean;
}

export interface NotifyDeps {
  listRecipients(): Promise<Recipient[]>;
  loadSnapshot(r: Recipient, today: string): Promise<EventSnapshot>;
  /** Inserts rows, skipping known dedup keys; returns how many were new. */
  insert(rows: OutboxInsert[]): Promise<number>;
}

export function toInserts(snapshot: EventSnapshot, events: NotificationEvent[], now: Date): OutboxInsert[] {
  const prefs: NotificationPrefs = snapshot.prefs;
  const after = pushAfter(now, prefs.quietHours);
  return events.map((event) => ({
    userId: snapshot.userId,
    householdId: snapshot.householdId,
    event,
    pushAfter: after,
    pushMuted: prefs.pushMutedKinds.includes(event.kind),
  }));
}

/** Daily: computes each member's notifications per household and queues the new ones. */
export function createNotifyEventsJob(deps: NotifyDeps): Job {
  return {
    name: "notify-events",
    intervalMs: 5 * 60_000,
    timeoutMs: 10 * 60_000,
    isDue: dailyDue(NOTIFY_HOUR_UTC),
    async run(ctx) {
      const today = todayISO(ctx.now);
      const recipients = await deps.listRecipients();
      let queued = 0;
      const failures: string[] = [];
      for (const r of recipients) {
        ctx.signal.throwIfAborted();
        try {
          const snapshot = await deps.loadSnapshot(r, today);
          queued += await deps.insert(toInserts(snapshot, selectEvents(snapshot), ctx.now));
        } catch (error) {
          // Missing table or column (deploy in progress): the original error reaches runJob, which tolerates it.
          if (isSchemaNotReady(error)) throw error;
          // One broken household must not stop the others; the run still fails at the end.
          failures.push(errorMessage(error));
          ctx.log("error", "notify recipient failed", { household: r.householdId, error: errorMessage(error) });
        }
      }
      ctx.log("info", "notifications queued", { recipients: recipients.length, queued, failed: failures.length });
      if (failures.length) throw new Error(`notify-events failed for ${failures.length} recipient(s): ${failures[0]}`);
    },
  };
}
