import { afterEach, describe, expect, it, vi } from "vitest";
import type { Job } from "../jobs/types.ts";
import { createSerialQueue } from "./queue.ts";
import { createScheduler, dueJobs } from "./scheduler.ts";

const job = (name: string, intervalMs: number): Job => ({ name, intervalMs, timeoutMs: 1_000, run: async () => {} });

describe("dueJobs", () => {
  const jobs = [job("fast", 1_000), job("slow", 10_000)];

  it("treats never-run jobs as due", () => {
    expect(dueJobs(jobs, new Map(), 0).map((j) => j.name)).toEqual(["fast", "slow"]);
  });

  it("returns only jobs whose interval has elapsed", () => {
    const last = new Map([
      ["fast", 0],
      ["slow", 0],
    ]);
    expect(dueJobs(jobs, last, 999)).toEqual([]);
    expect(dueJobs(jobs, last, 1_000).map((j) => j.name)).toEqual(["fast"]);
    expect(dueJobs(jobs, last, 10_000).map((j) => j.name)).toEqual(["fast", "slow"]);
  });
});

describe("createScheduler", () => {
  afterEach(() => vi.useRealTimers());

  it("runs due jobs through the queue and waits for the interval", async () => {
    const queue = createSerialQueue(() => {});
    const runJob = vi.fn(async () => {});
    const scheduler = createScheduler({ jobs: [job("a", 1_000)], queue, tickMs: 100, runJob });
    scheduler.tick(0);
    scheduler.tick(500);
    await queue.idle();
    expect(runJob).toHaveBeenCalledTimes(1);
    scheduler.tick(1_000);
    await queue.idle();
    expect(runJob).toHaveBeenCalledTimes(2);
  });

  it("does not enqueue a job that is still pending", async () => {
    const queue = createSerialQueue(() => {});
    let release!: () => void;
    const runJob = vi.fn().mockImplementationOnce(() => new Promise<void>((r) => (release = r))).mockResolvedValue(undefined);
    const scheduler = createScheduler({ jobs: [job("a", 1_000)], queue, tickMs: 100, runJob });
    scheduler.tick(0);
    await vi.waitFor(() => expect(runJob).toHaveBeenCalledTimes(1));
    scheduler.tick(5_000);
    release();
    await queue.idle();
    expect(runJob).toHaveBeenCalledTimes(1);
    // The skipped tick did not record a start: the job is due again right away.
    scheduler.tick(5_001);
    await queue.idle();
    expect(runJob).toHaveBeenCalledTimes(2);
  });

  it("ticks on start and on every interval until stopped", () => {
    vi.useFakeTimers();
    const queue = { push: vi.fn(() => true), has: () => false, idle: async () => {} };
    const scheduler = createScheduler({ jobs: [job("a", 0)], queue, tickMs: 100, runJob: async () => {} });
    scheduler.start();
    expect(queue.push).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(250);
    expect(queue.push).toHaveBeenCalledTimes(3);
    scheduler.stop();
    vi.advanceTimersByTime(500);
    expect(queue.push).toHaveBeenCalledTimes(3);
  });
});
