import { describe, expect, it } from "vitest";
import { counterDelta, cpuPercent, parseCpuStat, parseLoadavg, parseMeminfo, parseNetDev, parseUptime } from "./proc.ts";

describe("parseCpuStat / cpuPercent", () => {
  const a = parseCpuStat("cpu  100 0 50 800 50 0 0 0 0 0\ncpu0 100 0 50 800 50 0 0 0 0 0\nintr 1");
  it("reads idle (with iowait) and total from the aggregate line", () => {
    expect(a).toEqual({ idle: 850, total: 1000 });
  });
  it("computes the busy share between readings", () => {
    const b = parseCpuStat("cpu  130 0 60 860 50 0 0 0 0 0");
    expect(cpuPercent(a, b)).toBe(40);
  });
  it("returns null when counters did not move or went back", () => {
    expect(cpuPercent(a, a)).toBeNull();
    expect(cpuPercent(a, { idle: 10, total: 2000 })).toBeNull();
  });
  it("throws without a cpu line", () => {
    expect(() => parseCpuStat("intr 1")).toThrow(/cpu/);
  });
});

describe("parseMeminfo", () => {
  it("converts kB to bytes and derives used memory and swap", () => {
    const m = parseMeminfo("MemTotal:  1000 kB\nMemFree: 100 kB\nMemAvailable:  400 kB\nSwapTotal: 2000 kB\nSwapFree: 1500 kB\n");
    expect(m).toEqual({ memTotal: 1_024_000, memUsed: 614_400, swapTotal: 2_048_000, swapUsed: 512_000 });
  });
  it("throws on a missing key", () => {
    expect(() => parseMeminfo("MemTotal: 1 kB")).toThrow(/SwapTotal/);
  });
});

describe("parseLoadavg / parseUptime", () => {
  it("reads the three loads", () => {
    expect(parseLoadavg("0.52 0.40 0.31 1/123 4567\n")).toEqual([0.52, 0.4, 0.31]);
  });
  it("reads whole seconds since boot", () => {
    expect(parseUptime("12345.67 23456.78\n")).toBe(12345);
  });
  it("rejects garbage", () => {
    expect(() => parseLoadavg("x")).toThrow();
    expect(() => parseUptime("x")).toThrow();
  });
});

describe("parseNetDev / counterDelta", () => {
  const text = [
    "Inter-|   Receive                                                |  Transmit",
    " face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed",
    "    lo: 9999 10 0 0 0 0 0 0 9999 10 0 0 0 0 0 0",
    "  eth0: 1000 10 0 0 0 0 0 0 200 5 0 0 0 0 0 0",
    "tailscale0: 50 1 0 0 0 0 0 0 30 1 0 0 0 0 0 0",
  ].join("\n");
  it("sums every interface but loopback", () => {
    expect(parseNetDev(text)).toEqual({ rx: 1050, tx: 230 });
  });
  it("returns null when a counter went back", () => {
    expect(counterDelta(100, 150)).toBe(50);
    expect(counterDelta(150, 100)).toBeNull();
  });
});
