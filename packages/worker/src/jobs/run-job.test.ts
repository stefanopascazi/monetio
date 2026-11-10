import { describe, expect, it, vi } from "vitest";
import type { Heartbeat } from "../heartbeat.ts";
import type { LockStore } from "./lock.ts";
import { runJob } from "./run-job.ts";
import type { Job } from "./types.ts";

function setup(acquired = true) {
  const locks: LockStore = { acquire: vi.fn(async () => acquired), release: vi.fn(async () => {}) };
  const heartbeat = { ping: vi.fn<Heartbeat["ping"]>(async () => {}) };
  const log = vi.fn();
  const deps = { locks, heartbeat, log, holder: "w1", shutdown: new AbortController().signal };
  return { deps, locks, heartbeat, log };
}

const job = (run: Job["run"]): Job => ({ name: "demo", intervalMs: 1_000, timeoutMs: 5_000, run });

describe("runJob", () => {
  it("runs under the lease and reports success", async () => {
    const { deps, locks, heartbeat, log } = setup();
    const run = vi.fn(async () => {});
    await runJob(job(run), deps);
    expect(locks.acquire).toHaveBeenCalledWith("demo", "w1", 5_000);
    expect(run).toHaveBeenCalledWith(expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(heartbeat.ping.mock.calls.map((c) => c[1])).toEqual(["start", "success"]);
    expect(log).toHaveBeenCalledWith("info", "job done", expect.objectContaining({ job: "demo" }));
  });

  it("skips the run when the lease is held elsewhere", async () => {
    const { deps, heartbeat } = setup(false);
    const run = vi.fn(async () => {});
    await runJob(job(run), deps);
    expect(run).not.toHaveBeenCalled();
    expect(heartbeat.ping).toHaveBeenLastCalledWith("demo", "success", expect.stringContaining("skipped"));
  });

  it("reports failures without throwing", async () => {
    const { deps, locks, heartbeat, log } = setup();
    await expect(
      runJob(
        job(async () => {
          throw new Error("boom");
        }),
        deps,
      ),
    ).resolves.toBeUndefined();
    expect(locks.release).toHaveBeenCalled();
    expect(heartbeat.ping).toHaveBeenLastCalledWith("demo", "fail", "boom");
    expect(log).toHaveBeenCalledWith("error", "job failed", expect.objectContaining({ error: "boom" }));
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
});
