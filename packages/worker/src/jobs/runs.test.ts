import { describe, expect, it, vi } from "vitest";
import { createJobRunsPurgeJob, JOB_RUNS_RETENTION_DAYS } from "./runs.ts";

const now = new Date("2026-12-31T03:00:00Z");
const ctx = () => ({ log: vi.fn(), signal: new AbortController().signal, now });
const store = (removed: number) => ({ record: vi.fn(async () => {}), purge: vi.fn(async () => removed) });

describe("createJobRunsPurgeJob", () => {
  it("deletes runs older than the retention", async () => {
    const s = store(42);
    const c = ctx();
    await createJobRunsPurgeJob(s).run(c);
    expect(s.purge).toHaveBeenCalledWith(new Date(now.getTime() - JOB_RUNS_RETENTION_DAYS * 86_400_000));
    expect(c.log).toHaveBeenCalledWith("info", "job runs purged", { removed: 42 });
  });

  it("stays quiet when there is nothing to delete", async () => {
    const c = ctx();
    await createJobRunsPurgeJob(store(0)).run(c);
    expect(c.log).not.toHaveBeenCalled();
  });

  it("runs once a day", () => {
    const job = createJobRunsPurgeJob(store(0));
    expect(job.isDue!(null, now)).toBe(true);
    expect(job.isDue!(new Date(now.getTime() - 23 * 3_600_000), now)).toBe(false);
    expect(job.isDue!(new Date(now.getTime() - 24 * 3_600_000), now)).toBe(true);
  });
});
