import { describe, expect, it } from "vitest";
import { alertMessage, evaluateAlerts, windowMinutes, type AlertInput, type AlertSample, type AlertSettings } from "./alerts.ts";

const NOW = new Date("2026-11-25T12:00:00Z");
const START = new Date("2026-11-25T08:00:00Z");
const settings: AlertSettings = { cpu_pct: 90, cpu_minutes: 15, ram_pct: 90, ram_minutes: 10, swap_pct: 50, disk_pct: 85, traffic_factor: 5, traffic_floor_mb: 50, push_enabled: true };

function s(minutesAgo: number, o: Partial<AlertSample> = {}): AlertSample {
  return { sampledAt: new Date(NOW.getTime() - minutesAgo * 60_000), cpuPct: 10, memPct: 50, swapPct: 3, diskPct: 54, netBytes: 1000, uptimeS: 100_000 - minutesAgo * 60, workerStartedAt: START, workerRelease: "r1", ...o };
}

/** One sample a minute for `count` minutes up to now, shaped by `o`. */
const run = (count: number, o: (i: number) => Partial<AlertSample> = () => ({})) => Array.from({ length: count }, (_, i) => s(count - 1 - i, o(i)));

const input = (o: Partial<AlertInput>): AlertInput => ({ now: NOW, settings, samples: run(20), evaluatedUntil: new Date(NOW.getTime() - 60_000), hourlyTrafficAvg: 60_000, openKinds: [], ...o });

describe("evaluateAlerts — thresholds", () => {
  it("opens nothing on a quiet machine and moves the bookmark to the latest sample", () => {
    const d = evaluateAlerts(input({}));
    expect(d).toMatchObject({ open: [], keep: [], resolve: [], events: [] });
    expect(d.evaluatedUntil).toEqual(NOW);
  });

  it("opens RAM only when every sample of the window is above the threshold", () => {
    expect(evaluateAlerts(input({ samples: run(20, () => ({ memPct: 95 })) })).open).toEqual([{ kind: "ram_high", details: { value: 95, threshold: 90, minutes: 10 } }]);
    const dip = run(20, (i) => ({ memPct: i === 15 ? 80 : 95 }));
    expect(evaluateAlerts(input({ samples: dip })).open).toEqual([]);
  });

  it("opens CPU on the window average", () => {
    const d = evaluateAlerts(input({ samples: run(20, () => ({ cpuPct: 96 })) }));
    expect(d.open.map((o) => o.kind)).toEqual(["cpu_high"]);
  });

  it("keeps an open alert inside the hysteresis band and resolves it below", () => {
    expect(evaluateAlerts(input({ samples: run(20, () => ({ diskPct: 84 })), openKinds: ["disk_high"] })).keep.map((k) => k.kind)).toEqual(["disk_high"]);
    expect(evaluateAlerts(input({ samples: run(20, () => ({ diskPct: 80 })), openKinds: ["disk_high"] })).resolve).toEqual(["disk_high"]);
    expect(evaluateAlerts(input({ samples: run(20, () => ({ swapPct: 47 })), openKinds: ["swap_high"] })).keep.map((k) => k.kind)).toEqual(["swap_high"]);
  });

  it("does not judge a window with too few samples, nor stale samples", () => {
    const sparse = [s(14, { cpuPct: 99 }), s(7, { cpuPct: 99 }), s(0, { cpuPct: 99 })];
    expect(evaluateAlerts(input({ samples: sparse })).open.map((o) => o.kind)).not.toContain("cpu_high");
    const old = run(20, () => ({ diskPct: 99 })).map((x) => ({ ...x, sampledAt: new Date(x.sampledAt.getTime() - 30 * 60_000) }));
    expect(evaluateAlerts(input({ samples: old, openKinds: ["disk_high"] }))).toMatchObject({ open: [], resolve: [], keep: [] });
  });

  it("flags traffic above the multiple of the average and the floor", () => {
    const heavy = 10 * 1024 * 1024; // 10 MB a minute = 150 MB in 15 minutes
    expect(evaluateAlerts(input({ samples: run(20, () => ({ netBytes: heavy })) })).open.map((o) => o.kind)).toEqual(["traffic_spike"]);
    // Under the 50 MB floor even if far above a tiny average.
    expect(evaluateAlerts(input({ samples: run(20, () => ({ netBytes: 1024 * 1024 })), hourlyTrafficAvg: 1000 })).open).toEqual([]);
    // No baseline yet: no judgement.
    expect(evaluateAlerts(input({ samples: run(20, () => ({ netBytes: heavy })), hourlyTrafficAvg: null })).open).toEqual([]);
  });
});

describe("evaluateAlerts — events", () => {
  it("records a silence once, when the samples come back", () => {
    const samples = [s(30), s(2), s(1), s(0)];
    const d = evaluateAlerts(input({ samples, evaluatedUntil: s(30).sampledAt }));
    expect(d.events).toEqual([{ kind: "silence", at: s(2).sampledAt, details: { from: s(30).sampledAt.toISOString(), to: s(2).sampledAt.toISOString(), minutes: 28 } }]);
    expect(evaluateAlerts(input({ samples, evaluatedUntil: s(0).sampledAt })).events).toEqual([]);
  });

  it("tells an unexpected restart from a deploy", () => {
    const later = new Date(NOW.getTime() - 60_000);
    const crash = [s(2), s(1, { workerStartedAt: later })];
    expect(evaluateAlerts(input({ samples: crash, evaluatedUntil: s(2).sampledAt })).events.map((e) => e.kind)).toEqual(["worker_restart"]);
    const deploy = [s(2), s(1, { workerStartedAt: later, workerRelease: "r2" })];
    expect(evaluateAlerts(input({ samples: deploy, evaluatedUntil: s(2).sampledAt })).events).toEqual([]);
    const legacy = [s(2, { workerRelease: null }), s(1, { workerStartedAt: later, workerRelease: null })];
    expect(evaluateAlerts(input({ samples: legacy, evaluatedUntil: s(2).sampledAt })).events).toEqual([]);
  });

  it("reports a reboot instead of the worker restart it causes", () => {
    const samples = [s(3), s(1, { uptimeS: 50, workerStartedAt: new Date(NOW.getTime() - 60_000) })];
    expect(evaluateAlerts(input({ samples, evaluatedUntil: s(3).sampledAt })).events.map((e) => e.kind)).toEqual(["reboot"]);
  });

  it("raises no events from history on the first run", () => {
    expect(evaluateAlerts(input({ samples: [s(30), s(0)], evaluatedUntil: null })).events).toEqual([]);
  });
});

describe("windowMinutes / alertMessage", () => {
  it("looks back over the largest window", () => {
    expect(windowMinutes(settings)).toBe(15);
    expect(windowMinutes({ ...settings, ram_minutes: 30 })).toBe(30);
  });

  it("writes Italian push texts", () => {
    expect(alertMessage("ram_high", "open", { value: 92.5, threshold: 90, minutes: 10 })).toEqual({
      title: "VPS: RAM quasi piena",
      body: "RAM al 92,5% da almeno 10 minuti (soglia 90%).",
    });
    expect(alertMessage("disk_high", "resolved", {}).title).toBe("VPS: Disco quasi pieno rientrato");
    expect(alertMessage("silence", "event", { minutes: 28 }).body).toMatch(/28 minuti/);
  });
});
