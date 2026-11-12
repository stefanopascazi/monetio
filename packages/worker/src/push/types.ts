/** A browser subscription as stored in push_subscriptions. */
export interface PushSubscriptionRow {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** A queued notification (push_outbox). */
export interface OutboxRow {
  id: string;
  userId: string;
  title: string;
  body: string;
  url: string;
  tag: string | null;
}

/** JSON the service worker receives in the push event. */
export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

/** sent: delivered to the push service; gone: subscription expired (delete it); error: retry later. */
export type SendResult = { status: "sent" } | { status: "gone" } | { status: "error"; message: string };

export interface PushSender {
  send(subscription: PushSubscriptionRow, payload: PushPayload, signal: AbortSignal): Promise<SendResult>;
}

export interface PushStore {
  /** Undelivered rows still worth trying (not abandoned), oldest first. */
  pending(limit: number): Promise<OutboxRow[]>;
  subscriptionsFor(userIds: string[]): Promise<PushSubscriptionRow[]>;
  markSent(outboxId: string, note: string | null): Promise<void>;
  markFailed(outboxId: string, error: string): Promise<void>;
  deleteSubscription(subscriptionId: string): Promise<void>;
  touchSubscription(subscriptionId: string): Promise<void>;
  /** Removes delivered or abandoned rows older than the cutoff; returns how many. */
  purge(before: Date): Promise<number>;
}
