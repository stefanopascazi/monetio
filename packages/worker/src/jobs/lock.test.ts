import { describe, expect, it, vi } from "vitest";
import { type LockStore, withJobLock } from "./lock.ts";

/** In-memory lease store with a controllable clock. */
function memoryStore(clock: { now: number }): LockStore {
  const leases = new Map<string, { holder: string; until: number; success?: number }>();
  return {
    async acquire(name, holder, ttlMs) {
      const lease = leases.get(name);
      if (lease && lease.until > clock.now) return false;
      leases.set(name, { holder, until: clock.now + ttlMs });
      return true;
    },
    async release(name, holder) {
      const lease = leases.get(name);
      if (lease?.holder === holder) lease.until = clock.now;
    },
    async lastSuccess(name) {
      const at = leases.get(name)?.success;
      return at === undefined ? null : new Date(at);
    },
    async markSuccess(name, holder) {
      const lease = leases.get(name);
      if (lease?.holder === holder) lease.success = clock.now;
    },
  };
}

describe("withJobLock", () => {
  it("runs the job and releases the lease", async () => {
    const store = memoryStore({ now: 0 });
    expect(await withJobLock(store, "job", "a", 1_000, async () => 42)).toEqual({ ran: true, value: 42 });
    expect(await withJobLock(store, "job", "b", 1_000, async () => 1)).toEqual({ ran: true, value: 1 });
  });

  it("skips the job while another holder owns the lease", async () => {
    const clock = { now: 0 };
    const store = memoryStore(clock);
    await store.acquire("job", "vercel", 1_000);
    const fn = vi.fn(async () => {});
    expect(await withJobLock(store, "job", "worker", 1_000, fn)).toEqual({ ran: false });
    expect(fn).not.toHaveBeenCalled();
    // An expired lease (crashed holder) is taken over.
    clock.now = 1_000;
    expect((await withJobLock(store, "job", "worker", 1_000, fn)).ran).toBe(true);
  });

  it("releases the lease when the job throws", async () => {
    const store = memoryStore({ now: 0 });
    await expect(
      withJobLock(store, "job", "a", 1_000, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect((await withJobLock(store, "job", "b", 1_000, async () => {})).ran).toBe(true);
  });

  it("does not release a lease owned by someone else", async () => {
    const store = memoryStore({ now: 0 });
    await store.acquire("job", "a", 1_000);
    await store.release("job", "b");
    expect(await store.acquire("job", "c", 1_000)).toBe(false);
  });
});
