import { describe, expect, it } from "vitest";
import { createVpsSampler, type SamplerSources } from "./sampler.ts";

const NET_HEAD = "h1\nh2\n";

function sources(files: Record<string, string[]>): SamplerSources {
  const calls: Record<string, number> = {};
  return {
    async readFile(path) {
      const list = files[path]!;
      const i = calls[path] ?? 0;
      calls[path] = i + 1;
      return list[Math.min(i, list.length - 1)]!;
    },
    statfs: async () => ({ bsize: 4096, blocks: 1000, bfree: 250 }),
    rss: () => 50_000_000,
    now: () => new Date("2026-11-25T10:00:00Z"),
    startedAt: new Date("2026-11-25T09:00:00Z"),
  };
}

const files = {
  "/proc/stat": ["cpu  100 0 50 800 50 0 0 0\n", "cpu  130 0 60 860 50 0 0 0\n"],
  "/proc/meminfo": ["MemTotal: 1000 kB\nMemAvailable: 400 kB\nSwapTotal: 0 kB\nSwapFree: 0 kB\n"],
  "/proc/loadavg": ["0.5 0.4 0.3 1/2 3\n"],
  "/proc/net/dev": [`${NET_HEAD}eth0: 1000 0 0 0 0 0 0 0 500 0\n`, `${NET_HEAD}eth0: 1600 0 0 0 0 0 0 0 700 0\n`],
  "/proc/uptime": ["3600.5 1\n"],
};

describe("createVpsSampler", () => {
  it("leaves CPU and traffic null on the first sample, then reports deltas", async () => {
    const sample = createVpsSampler(sources(files));
    const first = await sample();
    expect(first).toMatchObject({
      cpuPct: null,
      netRx: null,
      netTx: null,
      load: [0.5, 0.4, 0.3],
      memTotal: 1_024_000,
      memUsed: 614_400,
      diskTotal: 4_096_000,
      diskUsed: 3_072_000,
      uptimeS: 3600,
      workerRss: 50_000_000,
    });
    const second = await sample();
    expect(second).toMatchObject({ cpuPct: 40, netRx: 600, netTx: 200 });
  });
});
