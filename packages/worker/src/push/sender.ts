import webpush from "web-push";
import type { PushPayload, PushSender, PushSubscriptionRow, SendResult } from "./types.ts";

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  /** mailto: or https: contact sent to push services. */
  subject: string;
}

/** Push services keep undelivered messages this long (device offline). */
const TTL_SECONDS = 24 * 60 * 60;

/** Maps a web-push failure: 404/410 mean the subscription is dead, anything else is retried. */
export function classifyPushError(error: unknown): SendResult {
  const statusCode = (error as { statusCode?: unknown } | null)?.statusCode;
  if (statusCode === 404 || statusCode === 410) return { status: "gone" };
  const message = error instanceof Error ? error.message : String(error);
  return { status: "error", message: typeof statusCode === "number" ? `HTTP ${statusCode}: ${message}` : message };
}

export function createWebPushSender(vapid: VapidConfig, send = webpush.sendNotification): PushSender {
  const options = { TTL: TTL_SECONDS, vapidDetails: vapid, timeout: 15_000 };
  return {
    async send(sub: PushSubscriptionRow, payload: PushPayload, signal: AbortSignal) {
      signal.throwIfAborted();
      try {
        await send({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), options);
        return { status: "sent" };
      } catch (error) {
        return classifyPushError(error);
      }
    },
  };
}
