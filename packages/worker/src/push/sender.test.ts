import { describe, expect, it, vi } from "vitest";
import { classifyPushError, createWebPushSender } from "./sender.ts";

const vapid = { publicKey: "pub", privateKey: "priv", subject: "mailto:a@example.com" };
const sub = { id: "s1", userId: "u1", endpoint: "https://push.example/abc", p256dh: "key", auth: "secret" };
const payload = { title: "MonetIO", body: "Ciao", url: "/" };
const signal = new AbortController().signal;

describe("classifyPushError", () => {
  it("treats 404 and 410 as expired subscriptions", () => {
    expect(classifyPushError({ statusCode: 410 })).toEqual({ status: "gone" });
    expect(classifyPushError({ statusCode: 404 })).toEqual({ status: "gone" });
  });

  it("keeps other failures retryable with their status", () => {
    expect(classifyPushError(Object.assign(new Error("rate limited"), { statusCode: 429 }))).toEqual({ status: "error", message: "HTTP 429: rate limited" });
    expect(classifyPushError(new Error("ECONNRESET"))).toEqual({ status: "error", message: "ECONNRESET" });
  });
});

describe("createWebPushSender", () => {
  it("sends the JSON payload with VAPID details and a TTL", async () => {
    const send = vi.fn(async () => ({ statusCode: 201, body: "", headers: {} }));
    const result = await createWebPushSender(vapid, send).send(sub, payload, signal);
    expect(result).toEqual({ status: "sent" });
    expect(send).toHaveBeenCalledWith(
      { endpoint: sub.endpoint, keys: { p256dh: "key", auth: "secret" } },
      JSON.stringify(payload),
      expect.objectContaining({ vapidDetails: vapid, TTL: 86_400 }),
    );
  });

  it("classifies send failures instead of throwing", async () => {
    const send = vi.fn(async () => Promise.reject({ statusCode: 410 }));
    expect(await createWebPushSender(vapid, send).send(sub, payload, signal)).toEqual({ status: "gone" });
  });

  it("does not send once aborted", async () => {
    const send = vi.fn();
    await expect(createWebPushSender(vapid, send).send(sub, payload, AbortSignal.abort())).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
});
