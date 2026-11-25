import { afterEach, describe, expect, it, vi } from "vitest";
import { createMetricsLoop } from "./loop.ts";
import type { VpsSample } from "./sampler.ts";

const sample = { sampledAt: new Date(0) } as VpsSample;

function deps(overrides: Partial<Parameters<typeof createMetricsLoop>[0]> = {}) {
  return { sample: vi.fn(async () => sample), write: vi.fn(async () => {}), schemaReady: vi.fn(async () => true), log: vi.fn(), ...overrides };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("createMetricsLoop", () => {
  it("writes each sample once the schema is ready", async () => {
    const d = deps();
    await createMetricsLoop(d).tick();
    expect(d.write).toHaveBeenCalledWith(sample);
  });

  it("samples but does not write while the migration is pending", async () => {
    const d = deps({ schemaReady: vi.fn(async () => false) });
    await createMetricsLoop(d).tick();
    expect(d.sample).toHaveBeenCalled();
    expect(d.write).not.toHaveBeenCalled();
  });

  it("logs a failure and keeps going; missing tables stay quiet", async () => {
    const d = deps({ write: vi.fn().mockRejectedValueOnce(new Error("boom")).mockRejectedValueOnce(Object.assign(new Error("x"), { code: "42P01" })) });
    const loop = createMetricsLoop(d);
    await loop.tick();
    await loop.tick();
    expect(d.log).toHaveBeenCalledTimes(1);
    expect(d.log).toHaveBeenCalledWith("warn", "vps sample failed", { error: "boom" });
  });

  it("ticks at once and then every interval until stopped", async () => {
    vi.useFakeTimers();
    const d = deps();
    const loop = createMetricsLoop({ ...d, intervalMs: 1_000 });
    loop.start();
    await vi.advanceTimersByTimeAsync(2_500);
    expect(d.sample).toHaveBeenCalledTimes(3);
    loop.stop();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(d.sample).toHaveBeenCalledTimes(3);
  });
});
