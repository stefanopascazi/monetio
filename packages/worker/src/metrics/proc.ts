// Pure parsers for the Linux /proc files read by the VPS sampler (#104).

export interface CpuTimes {
  idle: number;
  total: number;
}

/** Aggregate "cpu" line of /proc/stat; idle includes iowait. */
export function parseCpuStat(text: string): CpuTimes {
  const line = text.split("\n").find((l) => /^cpu\s/.test(l));
  if (!line) throw new Error("no cpu line in /proc/stat");
  // user nice system idle iowait irq softirq steal (guest time is already part of user/nice)
  const v = line.trim().split(/\s+/).slice(1, 9).map(Number);
  const idle = (v[3] ?? 0) + (v[4] ?? 0);
  return { idle, total: v.reduce((a, b) => a + (b || 0), 0) };
}

/** Busy share between two readings, 0–100; null when the counters did not move or went back. */
export function cpuPercent(prev: CpuTimes, cur: CpuTimes): number | null {
  const total = cur.total - prev.total;
  const idle = cur.idle - prev.idle;
  if (total <= 0 || idle < 0) return null;
  return Math.min(100, Math.max(0, Math.round(((total - idle) / total) * 1000) / 10));
}

export interface MemInfo {
  memTotal: number;
  memUsed: number;
  swapTotal: number;
  swapUsed: number;
}

/** /proc/meminfo in bytes; used memory = MemTotal - MemAvailable. */
export function parseMeminfo(text: string): MemInfo {
  const kb = (key: string) => {
    const m = new RegExp(`^${key}:\\s+(\\d+)`, "m").exec(text);
    if (!m) throw new Error(`no ${key} in /proc/meminfo`);
    return Number(m[1]) * 1024;
  };
  const memTotal = kb("MemTotal");
  const swapTotal = kb("SwapTotal");
  return { memTotal, memUsed: Math.max(0, memTotal - kb("MemAvailable")), swapTotal, swapUsed: Math.max(0, swapTotal - kb("SwapFree")) };
}

/** /proc/loadavg: 1, 5 and 15-minute load. */
export function parseLoadavg(text: string): [number, number, number] {
  const [a, b, c] = text.trim().split(/\s+/).map(Number);
  if (![a, b, c].every(Number.isFinite)) throw new Error("bad /proc/loadavg");
  return [a!, b!, c!];
}

export interface NetCounters {
  rx: number;
  tx: number;
}

/** Received and sent bytes summed over every interface but loopback (/proc/net/dev). */
export function parseNetDev(text: string): NetCounters {
  let rx = 0;
  let tx = 0;
  for (const line of text.split("\n").slice(2)) {
    const [name, data] = line.split(":");
    if (!data || name!.trim() === "lo") continue;
    const f = data.trim().split(/\s+/).map(Number);
    rx += f[0] || 0;
    tx += f[8] || 0;
  }
  return { rx, tx };
}

/** Growth of a counter; null when it went back (reboot or wrap). */
export const counterDelta = (prev: number, cur: number): number | null => (cur >= prev ? cur - prev : null);

/** Seconds since boot, from /proc/uptime. */
export function parseUptime(text: string): number {
  const s = Number(text.trim().split(/\s+/)[0]);
  if (!Number.isFinite(s)) throw new Error("bad /proc/uptime");
  return Math.floor(s);
}
