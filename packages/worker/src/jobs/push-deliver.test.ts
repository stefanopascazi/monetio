import { describe, expect, it, vi } from "vitest";
import type { OutboxRow, PushSender, PushStore, PushSubscriptionRow, SendResult } from "../push/types.ts";
import { createPushDeliverJob, pushServiceHost } from "./push-deliver.ts";

const row = (id: string, userId = "u1"): OutboxRow => ({ id, userId, title: "T", body: "B", url: "/", tag: null });
const sub = (id: string, userId = "u1"): PushSubscriptionRow => ({ id, userId, endpoint: "https://push.example/" + id, p256dh: "k", auth: "a" });
const ctx = () => ({ log: vi.fn(), signal: new AbortController().signal, now: new Date("2026-11-12T10:00:00Z") });

function fakeStore(rows: OutboxRow[], subs: PushSubscriptionRow[]): PushStore {
  return {
    pending: vi.fn(async () => rows),
    subscriptionsFor: vi.fn(async () => subs),
    markSent: vi.fn(async () => {}),
    markFailed: vi.fn(async () => {}),
    deleteSubscription: vi.fn(async () => {}),
    touchSubscription: vi.fn(async () => {}),
    purge: vi.fn(async () => 0),
  };
}

const senderBy = (results: Record<string, SendResult>): PushSender => ({
  send: vi.fn(async (s: PushSubscriptionRow) => results[s.id] ?? { status: "sent" as const }),
});

describe("createPushDeliverJob", () => {
  it("runs every minute", () => {
    expect(createPushDeliverJob(fakeStore([], []), senderBy({})).intervalMs).toBe(60_000);
  });

  it("sends to every subscription of the user and marks the row sent", async () => {
    const store = fakeStore([row("o1")], [sub("s1"), sub("s2"), sub("x", "u2")]);
    const sender = senderBy({});
    await createPushDeliverJob(store, sender).run(ctx());
    expect(sender.send).toHaveBeenCalledTimes(2);
    expect(sender.send).toHaveBeenCalledWith(sub("s1"), { title: "T", body: "B", url: "/" }, expect.anything());
    expect(store.touchSubscription).toHaveBeenCalledWith("s2");
    expect(store.markSent).toHaveBeenCalledWith("o1", null);
  });

  it("passes the tag when present", async () => {
    const store = fakeStore([{ ...row("o1"), tag: "test" }], [sub("s1")]);
    const sender = senderBy({});
    await createPushDeliverJob(store, sender).run(ctx());
    expect(sender.send).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ tag: "test" }), expect.anything());
  });

  it("drops rows of users without subscriptions", async () => {
    const store = fakeStore([row("o1")], []);
    await createPushDeliverJob(store, senderBy({})).run(ctx());
    expect(store.markSent).toHaveBeenCalledWith("o1", "no subscription");
  });

  it("deletes expired subscriptions once and skips them for later rows", async () => {
    const store = fakeStore([row("o1"), row("o2")], [sub("s1"), sub("s2")]);
    const sender = senderBy({ s1: { status: "gone" } });
    await createPushDeliverJob(store, sender).run(ctx());
    expect(store.deleteSubscription).toHaveBeenCalledTimes(1);
    expect(sender.send).toHaveBeenCalledTimes(3);
    expect(store.markSent).toHaveBeenCalledWith("o2", null);
  });

  it("retries when no device received it and a failure is transient", async () => {
    const store = fakeStore([row("o1")], [sub("s1"), sub("s2")]);
    await createPushDeliverJob(store, senderBy({ s1: { status: "error", message: "HTTP 500" }, s2: { status: "gone" } })).run(ctx());
    expect(store.markFailed).toHaveBeenCalledWith("o1", "HTTP 500");
    expect(store.markSent).not.toHaveBeenCalled();
  });

  it("does not resend when at least one device received it", async () => {
    const store = fakeStore([row("o1")], [sub("s1"), sub("s2")]);
    await createPushDeliverJob(store, senderBy({ s1: { status: "error", message: "HTTP 500" } })).run(ctx());
    expect(store.markSent).toHaveBeenCalledWith("o1", null);
  });

  it("logs each delivery outcome with the push service host only", async () => {
    const store = fakeStore([row("o1")], [sub("s1"), sub("s2")]);
    const c = ctx();
    await createPushDeliverJob(store, senderBy({ s2: { status: "error", message: "HTTP 500" } })).run(c);
    expect(c.log).toHaveBeenCalledWith("info", "push sent", { outbox: "o1", subscription: "s1", service: "push.example" });
    expect(c.log).toHaveBeenCalledWith("warn", "push failed", { outbox: "o1", subscription: "s2", service: "push.example", error: "HTTP 500" });
  });

  it("extracts the push service host", () => {
    expect(pushServiceHost("https://fcm.googleapis.com/fcm/send/abc")).toBe("fcm.googleapis.com");
    expect(pushServiceHost("nope")).toBe("invalid");
  });

  it("purges rows older than 30 days on every run", async () => {
    const store = fakeStore([], []);
    await createPushDeliverJob(store, senderBy({})).run(ctx());
    expect(store.subscriptionsFor).not.toHaveBeenCalled();
    expect(store.purge).toHaveBeenCalledWith(new Date("2026-10-13T10:00:00Z"));
  });
});
