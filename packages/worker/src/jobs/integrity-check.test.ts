import { describe, expect, it, vi } from "vitest";
import { createIntegrityCheckJob, type IntegrityStore } from "./integrity-check.ts";

const ctx = (now = new Date("2026-11-20T12:00:00Z")) => ({ log: vi.fn(), signal: new AbortController().signal, now });

function store(over: Partial<IntegrityStore> = {}) {
  return {
    hasPendingRequest: vi.fn(async () => false),
    claimRequest: vi.fn(async () => null as number | null),
    finishRequest: vi.fn(async () => {}),
    run: vi.fn(async () => ({ transfer_unlinked: 2 })),
    ...over,
  };
}

describe("createIntegrityCheckJob", () => {
  it("runs nightly after 04:00 Italian time", async () => {
    const job = createIntegrityCheckJob(store());
    // 20 Nov: Rome is UTC+1, so the slot is 03:00 UTC.
    expect(await job.isDue!(new Date("2026-11-20T03:30:00Z"), new Date("2026-11-20T12:00:00Z"))).toBe(false);
    expect(await job.isDue!(new Date("2026-11-19T03:30:00Z"), new Date("2026-11-20T03:10:00Z"))).toBe(true);
    expect(await job.isDue!(null, new Date("2026-11-20T12:00:00Z"))).toBe(true);
  });

  it("is due at once when the console asked for a run", async () => {
    const s = store({ hasPendingRequest: vi.fn(async () => true) });
    expect(await createIntegrityCheckJob(s).isDue!(new Date("2026-11-20T03:30:00Z"), new Date("2026-11-20T12:00:00Z"))).toBe(true);
  });

  it("claims the request, runs and closes it", async () => {
    const s = store({ claimRequest: vi.fn(async () => 7) });
    const c = ctx();
    await createIntegrityCheckJob(s).run(c);
    expect(s.run).toHaveBeenCalledWith(7);
    expect(s.finishRequest).toHaveBeenCalledWith(7, null);
    expect(c.log).toHaveBeenCalledWith("info", "integrity checked", { requestId: 7, transfer_unlinked: 2 });
  });

  it("runs without a request on the nightly slot", async () => {
    const s = store();
    await createIntegrityCheckJob(s).run(ctx());
    expect(s.run).toHaveBeenCalledWith(null);
    expect(s.finishRequest).not.toHaveBeenCalled();
  });

  it("closes the request with the error and rethrows", async () => {
    const s = store({ claimRequest: vi.fn(async () => 3), run: vi.fn(async () => Promise.reject(new Error("timeout"))) });
    await expect(createIntegrityCheckJob(s).run(ctx())).rejects.toThrow("timeout");
    expect(s.finishRequest).toHaveBeenCalledWith(3, "timeout");
  });
});
