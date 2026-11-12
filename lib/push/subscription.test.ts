import { describe, expect, it } from "vitest";
import { parsePushSubscription, vapidKeyToBytes } from "./subscription";

const valid = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "BPx_-a1", auth: "q2w3" } };

describe("parsePushSubscription", () => {
  it("flattens a valid subscription", () => {
    expect(parsePushSubscription(valid)).toEqual({ endpoint: valid.endpoint, p256dh: "BPx_-a1", auth: "q2w3" });
  });

  it("rejects non-https or malformed endpoints", () => {
    expect(parsePushSubscription({ ...valid, endpoint: "http://push.example/x" })).toBeNull();
    expect(parsePushSubscription({ ...valid, endpoint: "https://" })).toBeNull();
    expect(parsePushSubscription({ ...valid, endpoint: "https://x/" + "a".repeat(1000) })).toBeNull();
  });

  it("rejects missing or non-base64url keys", () => {
    expect(parsePushSubscription({ endpoint: valid.endpoint })).toBeNull();
    expect(parsePushSubscription({ ...valid, keys: { p256dh: "a b", auth: "x" } })).toBeNull();
    expect(parsePushSubscription({ ...valid, keys: { p256dh: "abc", auth: 1 } })).toBeNull();
  });

  it("rejects non-objects", () => {
    expect(parsePushSubscription(null)).toBeNull();
    expect(parsePushSubscription("x")).toBeNull();
  });
});

describe("vapidKeyToBytes", () => {
  it("decodes base64url without padding", () => {
    expect(Array.from(vapidKeyToBytes("AQID_w"))).toEqual([1, 2, 3, 255]);
  });

  it("decodes a 65-byte VAPID public key", () => {
    const key = "BBKaIbWtjGM9F7iRQrGomT5cCNURq1JMdQe3wZO4NHggvP2fE-pxR1QKqIs8-uD_w-kcai6vUxaCJrkdDwB472U";
    const bytes = vapidKeyToBytes(key);
    expect(bytes).toHaveLength(65);
    expect(bytes[0]).toBe(4);
  });
});
