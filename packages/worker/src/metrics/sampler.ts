import { counterDelta, cpuPercent, parseCpuStat, parseLoadavg, parseMeminfo, parseNetDev, parseUptime, type CpuTimes, type NetCounters } from "./proc.ts";

/** One row of vps_metrics (migration 0046). */
export interface VpsSample {
  sampledAt: Date;
  cpuPct: number | null;
  load: [number, number, number];
  memTotal: number;
  memUsed: number;
  swapTotal: number;
  swapUsed: number;
  diskTotal: number;
  diskUsed: number;
  netRx: number | null;
  netTx: number | null;
  uptimeS: number;
  workerRss: number;
  workerStartedAt: Date;
}

export interface SamplerSources {
  readFile(path: string): Promise<string>;
  /** Filesystem of the root mount: block size, total and free blocks. */
  statfs(path: string): Promise<{ bsize: number; blocks: number; bfree: number }>;
  rss(): number;
  now(): Date;
  /** When this worker process started. */
  startedAt: Date;
}

/**
 * Reads the machine state from /proc. CPU and traffic are deltas against the previous call,
 * so the first sample after a start carries null for them.
 */
export function createVpsSampler(src: SamplerSources): () => Promise<VpsSample> {
  let prevCpu: CpuTimes | null = null;
  let prevNet: NetCounters | null = null;
  return async () => {
    const [stat, mem, load, net, uptime, fs] = await Promise.all([
      src.readFile("/proc/stat"),
      src.readFile("/proc/meminfo"),
      src.readFile("/proc/loadavg"),
      src.readFile("/proc/net/dev"),
      src.readFile("/proc/uptime"),
      src.statfs("/"),
    ]);
    const cpu = parseCpuStat(stat);
    const counters = parseNetDev(net);
    const m = parseMeminfo(mem);
    const sample: VpsSample = {
      sampledAt: src.now(),
      cpuPct: prevCpu ? cpuPercent(prevCpu, cpu) : null,
      load: parseLoadavg(load),
      memTotal: m.memTotal,
      memUsed: m.memUsed,
      swapTotal: m.swapTotal,
      swapUsed: m.swapUsed,
      diskTotal: fs.blocks * fs.bsize,
      diskUsed: (fs.blocks - fs.bfree) * fs.bsize,
      netRx: prevNet ? counterDelta(prevNet.rx, counters.rx) : null,
      netTx: prevNet ? counterDelta(prevNet.tx, counters.tx) : null,
      uptimeS: parseUptime(uptime),
      workerRss: src.rss(),
      workerStartedAt: src.startedAt,
    };
    prevCpu = cpu;
    prevNet = counters;
    return sample;
  };
}
