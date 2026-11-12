import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ update: vi.fn(), upsert: vi.fn(), eq: vi.fn(), is: vi.fn() }));

// Chain: from().update().eq().is() / from().update().is() / from().upsert().
const chain = { eq: (...a: unknown[]) => (calls.eq(...a), chain), is: (...a: unknown[]) => (calls.is(...a), Promise.resolve({ error: null })) };
const from = vi.fn(() => ({
  update: (v: unknown) => (calls.update(v), chain),
  upsert: (v: unknown, o: unknown) => (calls.upsert(v, o), Promise.resolve({ error: null })),
}));

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/data/context", () => ({ getUser: vi.fn(async () => ({ id: "u1", email: null })) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ from })) }));

const { markAllNotificationsRead, markNotificationRead, saveNotificationPrefs } = await import("./notifications");

const ID = "11111111-2222-3333-4444-555555555555";

beforeEach(() => Object.values(calls).forEach((f) => f.mockReset()));

describe("markNotificationRead", () => {
  it("stamps read_at on an unread row", async () => {
    expect((await markNotificationRead(ID)).ok).toBe(true);
    expect(from).toHaveBeenCalledWith("push_outbox");
    expect(calls.update).toHaveBeenCalledWith({ read_at: expect.any(String) });
    expect(calls.eq).toHaveBeenCalledWith("id", ID);
    expect(calls.is).toHaveBeenCalledWith("read_at", null);
  });

  it("rejects invalid ids", async () => {
    expect((await markNotificationRead("x")).ok).toBe(false);
    expect(calls.update).not.toHaveBeenCalled();
  });
});

describe("markAllNotificationsRead", () => {
  it("marks every unread row", async () => {
    const res = await markAllNotificationsRead();
    expect(res).toMatchObject({ ok: true, message: "Tutte le notifiche sono segnate come lette." });
    expect(calls.is).toHaveBeenCalledWith("read_at", null);
  });
});

describe("saveNotificationPrefs", () => {
  it("upserts the parsed preferences for the user", async () => {
    const fd = new FormData();
    fd.append("dueDays", "2");
    fd.append("staleDays", "30");
    fd.append("pushMuted", "overdue");
    const res = await saveNotificationPrefs({}, fd);
    expect(res.ok).toBe(true);
    expect(calls.upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "u1", due_days: 2, stale_days: 30, push_muted_kinds: ["overdue"] }), { onConflict: "user_id" });
  });

  it("reports invalid fields", async () => {
    const fd = new FormData();
    fd.append("dueDays", "99");
    fd.append("staleDays", "14");
    const res = await saveNotificationPrefs({}, fd);
    expect(res).toMatchObject({ ok: false, errors: { dueDays: expect.any(String) } });
    expect(calls.upsert).not.toHaveBeenCalled();
  });
});
