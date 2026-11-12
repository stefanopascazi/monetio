/** Subscription fields the server stores (PushSubscription.toJSON() shape, flattened). */
export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

const BASE64URL_RE = /^[A-Za-z0-9_-]+={0,2}$/;

/** Validates untrusted PushSubscription JSON coming from the browser. */
export function parsePushSubscription(value: unknown): PushSubscriptionInput | null {
  if (!value || typeof value !== "object") return null;
  const { endpoint, keys } = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || endpoint.length > 1000) return null;
  try {
    new URL(endpoint);
  } catch {
    return null;
  }
  const p256dh = keys?.p256dh;
  const auth = keys?.auth;
  if (typeof p256dh !== "string" || typeof auth !== "string") return null;
  if (!BASE64URL_RE.test(p256dh) || !BASE64URL_RE.test(auth) || p256dh.length > 200 || auth.length > 100) return null;
  return { endpoint, p256dh, auth };
}

/** VAPID public key (base64url) to the BufferSource pushManager.subscribe expects. */
export function vapidKeyToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
