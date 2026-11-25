import { describe, expect, it, vi } from "vitest";
import type { AlertInput, AlertSample } from "../metrics/alerts.ts";
import { createVpsAlertsJob, type VpsAlertStore } from "./vps-alerts.ts";

const NOW = new Date("2026-11-25T12:00:00Z");
const settings = { cpu_pct: 90, cpu_minutes: 15, ram_pct: 90, ram_minutes: 10, swap_pct: 50, disk_pct: 85, traffic_factor: 5, traffic_floor_mb: 50, push_enabled: true };
const sample = (minutesAgo: number, diskPct = 54): AlertSample => ({
  sampledAt: new Date(NOW.getTime() - minutesAgo * 60_000),
  cpuPct: 5,
  memPct: 50,
  swapPct: 3,
  diskPct,
  netBytes: 100,
  uptimeS: 100_000,
  workerStartedAt: new Date("2026-11-25T08:00:00Z"),
  workerRelease: "r1",
});

function store(loaded: Partial<Omit<AlertInput, "now">>): VpsAlertStore & { apply: ReturnType<typeof vi.fn> } {
  return {
    load: vi.fn(async () => ({ settings, samples: [sample(1), sample(0)], evaluatedUntil: sample(0).sampledAt, hourlyTrafficAvg: null, openKinds: [], ...loaded })),
    apply: vi.fn(async () => 2),
  };
}

const ctx = () => ({ log: vi.fn(), signal: new AbortController().signal, now: NOW });

describe("createVpsAlertsJob", () => {
  it("writes nothing when nothing changed", async () => {
    const st = store({});
    await createVpsAlertsJob(st).run(ctx());
    expect(st.apply).not.toHaveBeenCalled();
  });

  it("moves the bookmark quietly when new samples are uneventful", async () => {
    const st = store({ evaluatedUntil: sample(1).sampledAt });
    const c = ctx();
    await createVpsAlertsJob(st).run(c);
    expect(st.apply).toHaveBeenCalledWith(expect.objectContaining({ evaluatedUntil: sample(0).sampledAt }), settings);
    expect(c.log).not.toHaveBeenCalled();
  });

  it("applies an opened alert and logs it with the pushes queued", async () => {
    const st = store({ samples: [sample(1, 90), sample(0, 90)] });
    const c = ctx();
    await createVpsAlertsJob(st).run(c);
    expect(st.apply.mock.calls[0]![0].open.map((o: { kind: string }) => o.kind)).toEqual(["disk_high"]);
    expect(c.log).toHaveBeenCalledWith("warn", "vps alerts", { opened: ["disk_high"], resolved: [], events: [], pushes: 2 });
  });
});
