import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const eq = vi.fn();
const from = vi.fn(() => ({ delete: () => ({ eq }) }));

vi.mock("@/lib/data/context", () => ({ getContext: vi.fn(async () => ({})) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ rpc, from })) }));

const { removePushSubscription, savePushSubscription, sendTestNotification } = await import("./push");

const sub = { endpoint: "https://push.example/abc", keys: { p256dh: "key", auth: "secret" } };

beforeEach(() => {
  rpc.mockReset();
  eq.mockReset();
});

describe("savePushSubscription", () => {
  it("registers a valid subscription", async () => {
    rpc.mockResolvedValue({ error: null });
    const res = await savePushSubscription(sub, "UA");
    expect(res.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith("register_push_subscription", { p_endpoint: sub.endpoint, p_p256dh: "key", p_auth: "secret", p_user_agent: "UA" });
  });

  it("rejects invalid input without touching the database", async () => {
    const res = await savePushSubscription({ endpoint: "http://x" }, "UA");
    expect(res.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("reports database errors", async () => {
    rpc.mockResolvedValue({ error: { code: "42501", message: "denied" } });
    expect((await savePushSubscription(sub, "UA")).message).toBe("Non hai i permessi per questa operazione.");
  });
});

describe("removePushSubscription", () => {
  it("deletes by endpoint", async () => {
    eq.mockResolvedValue({ error: null });
    expect((await removePushSubscription(sub.endpoint)).ok).toBe(true);
    expect(from).toHaveBeenCalledWith("push_subscriptions");
    expect(eq).toHaveBeenCalledWith("endpoint", sub.endpoint);
  });

  it("ignores non-https endpoints", async () => {
    expect((await removePushSubscription("javascript:x")).ok).toBe(false);
    expect(eq).not.toHaveBeenCalled();
  });
});

describe("sendTestNotification", () => {
  it("confirms a queued test", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    expect((await sendTestNotification()).ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith("queue_test_notification");
  });

  it("explains a throttled or subscription-less request", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    const res = await sendTestNotification();
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/Attendi un minuto/);
  });
});
