import { describe, expect, it, vi } from "vitest";
import type { Heartbeat } from "../heartbeat.ts";
import type { LockStore } from "./lock.ts";
import { runJob, SCHEMA_GRACE_MS } from "./run-job.ts";
import type { Job } from "./types.ts";

function setup({ acquired = true, lastSuccess = null as Date | null } = {}) {
  const locks: LockStore = {
    acquire: vi.fn(async () => acquired),
    release: vi.fn(async () => {}),
    lastSuccess: vi.fn(async () => lastSuccess),
    markSuccess: vi.fn(async () => {}),
  };
  const heartbeat = { ping: vi.fn<Heartbeat["ping"]>(async () => {}) };
  const log = vi.fn();
  const reporter = { capture: vi.fn(), flush: vi.fn(async () => {}), sendTest: vi.fn() };
  const deps = { locks, heartbeat, reporter, log, holder: "w1", shutdown: new AbortController().signal, now: () => 1_000 };
  return { deps, locks, heartbeat, reporter, log };
}

const job = (run: Job["run"], isDue?: Job["isDue"]): Job => ({ name: "demo", intervalMs: 1_000, timeoutMs: 5_000, run, isDue });

describe("runJob", () => {
  it("runs under the lease, records success and pings start/success", async () => {
    const { deps, locks, heartbeat, log } = setup();
    const run = vi.fn(async () => {});
    await runJob(job(run), deps);
    expect(locks.acquire).toHaveBeenCalledWith("demo", "w1", 5_000);
    expect(run).toHaveBeenCalledWith(expect.objectContaining({ signal: expect.any(AbortSignal), now: new Date(1_000) }));
    expect(locks.markSuccess).toHaveBeenCalledWith("demo", "w1");
    expect(heartbeat.ping.mock.calls.map((c) => c[1])).toEqual(["start", "success"]);
    expect(log).toHaveBeenCalledWith("info", "job done", expect.objectContaining({ job: "demo" }));
  });

  it("skips silently when the lease is held elsewhere", async () => {
    const { deps, heartbeat } = setup({ acquired: false });
    const run = vi.fn(async () => {});
    await runJob(job(run), deps);
    expect(run).not.toHaveBeenCalled();
    expect(heartbeat.ping).not.toHaveBeenCalled();
  });

  it("skips silently when the job is not due", async () => {
    const last = new Date(500);
    const { deps, locks, heartbeat } = setup({ lastSuccess: last });
    const run = vi.fn(async () => {});
    const isDue = vi.fn(() => false);
    await runJob(job(run, isDue), deps);
    expect(isDue).toHaveBeenCalledWith(last, new Date(1_000));
    expect(run).not.toHaveBeenCalled();
    expect(heartbeat.ping).not.toHaveBeenCalled();
    expect(locks.release).toHaveBeenCalled();
  });

  it("runs when due", async () => {
    const { deps } = setup();
    const run = vi.fn(async () => {});
    await runJob(job(run, () => true), deps);
    expect(run).toHaveBeenCalled();
  });

  it("reports failures without throwing or recording success", async () => {
    const { deps, locks, heartbeat, reporter, log } = setup();
    await expect(
      runJob(
        job(async () => {
          throw new Error("boom");
        }),
        deps,
      ),
    ).resolves.toBeUndefined();
    expect(locks.markSuccess).not.toHaveBeenCalled();
    expect(locks.release).toHaveBeenCalled();
    expect(heartbeat.ping).toHaveBeenLastCalledWith("demo", "fail", "boom");
    expect(log).toHaveBeenCalledWith("error", "job failed", expect.objectContaining({ error: "boom" }));
    expect(reporter.capture).toHaveBeenCalledWith(expect.objectContaining({ message: "boom" }), { job: "demo" });
  });

  it("passes a signal aborted on shutdown", async () => {
    const { deps } = setup();
    const controller = new AbortController();
    let seen: AbortSignal | undefined;
    await runJob(
      job(async ({ signal }) => {
        seen = signal;
      }),
      { ...deps, shutdown: controller.signal },
    );
    controller.abort();
    expect(seen?.aborted).toBe(true);
  });

  describe("schema not ready after a deploy", () => {
    const missingTable = Object.assign(new Error('relation "push_outbox" does not exist'), { code: "42P01" });

    it("logs a warning without reporting during the grace period", async () => {
      const { deps, reporter, heartbeat, log } = setup();
      await runJob(job(async () => Promise.reject(missingTable)), { ...deps, bootedAt: 0 });
      expect(log).toHaveBeenCalledWith("warn", "schema not ready, retrying", expect.objectContaining({ job: "demo" }));
      expect(reporter.capture).not.toHaveBeenCalled();
      expect(heartbeat.ping.mock.calls.map((c) => c[1])).toEqual(["start"]);
    });

    it("reports it once the grace period is over", async () => {
      const { deps, reporter } = setup();
      await runJob(job(async () => Promise.reject(missingTable)), { ...deps, bootedAt: 1_000 - SCHEMA_GRACE_MS });
      expect(reporter.capture).toHaveBeenCalled();
    });

    it("waits, without lock, run or ping, while the schema gate is closed", async () => {
      const { deps, locks, heartbeat, reporter } = setup();
      const run = vi.fn(async () => {});
      await runJob(job(run), { ...deps, schemaReady: async () => false });
      expect(locks.acquire).not.toHaveBeenCalled();
      expect(run).not.toHaveBeenCalled();
      expect(heartbeat.ping).not.toHaveBeenCalled();
      expect(reporter.capture).not.toHaveBeenCalled();
    });

    it("runs once the schema gate opens", async () => {
      const { deps } = setup();
      const run = vi.fn(async () => {});
      await runJob(job(run), { ...deps, schemaReady: async () => true });
      expect(run).toHaveBeenCalled();
    });

    it("reports other database errors at once", async () => {
      const { deps, reporter } = setup();
      await runJob(job(async () => Promise.reject(Object.assign(new Error("deadlock"), { code: "40P01" }))), { ...deps, bootedAt: 0 });
      expect(reporter.capture).toHaveBeenCalled();
    });
  });
});
