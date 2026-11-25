import { describe, expect, it, vi } from "vitest";
import { createVpsMetricsRollupJob } from "./vps-metrics-rollup.ts";

const ctx = () => ({ log: vi.fn(), signal: new AbortController().signal, now: new Date() });

describe("createVpsMetricsRollupJob", () => {
  it("runs hourly and logs only when something was purged", async () => {
    const quiet = ctx();
    const job = createVpsMetricsRollupJob(async () => ({ hours: 1, purged_samples: 0, purged_hours: 0 }));
    expect(job.intervalMs).toBe(3_600_000);
    await job.run(quiet);
    expect(quiet.log).not.toHaveBeenCalled();

    const loud = ctx();
    await createVpsMetricsRollupJob(async () => ({ hours: 1, purged_samples: 60, purged_hours: 0 })).run(loud);
    expect(loud.log).toHaveBeenCalledWith("info", "vps metrics purged", { hours: 1, purged_samples: 60, purged_hours: 0 });
  });

  it("propagates failures to the runner", async () => {
    const job = createVpsMetricsRollupJob(vi.fn().mockRejectedValue(new Error("db down")));
    await expect(job.run(ctx())).rejects.toThrow("db down");
  });
});
