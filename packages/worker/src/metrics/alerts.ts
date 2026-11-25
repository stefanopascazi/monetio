// Pure evaluation of the VPS alerts (#104, block 2): threshold alerts and one-off events from the samples.

export type ThresholdKind = "cpu_high" | "ram_high" | "swap_high" | "disk_high" | "traffic_spike";
export type EventKind = "silence" | "worker_restart" | "reboot";
export type AlertKind = ThresholdKind | EventKind;

/** Row of vps_alert_settings (migration 0047). */
export interface AlertSettings {
  cpu_pct: number;
  cpu_minutes: number;
  ram_pct: number;
  ram_minutes: number;
  swap_pct: number;
  disk_pct: number;
  traffic_factor: number;
  traffic_floor_mb: number;
  push_enabled: boolean;
}

/** The columns of vps_metrics the evaluation needs. */
export interface AlertSample {
  sampledAt: Date;
  cpuPct: number | null;
  memPct: number;
  swapPct: number | null;
  diskPct: number;
  netBytes: number | null;
  uptimeS: number;
  workerStartedAt: Date;
  workerRelease: string | null;
}

export interface AlertInput {
  now: Date;
  settings: AlertSettings;
  /** Ascending; starts with the last sample at or before the evaluation cutoff. */
  samples: AlertSample[];
  /** Last sample already evaluated; null on the very first run (no events from history). */
  evaluatedUntil: Date | null;
  /** Average traffic per hour over 7 days, null with less than a day of history. */
  hourlyTrafficAvg: number | null;
  openKinds: ThresholdKind[];
}

export interface AlertDecision {
  open: { kind: ThresholdKind; details: Record<string, unknown> }[];
  /** Still above the threshold: refresh last_seen_at and details. */
  keep: { kind: ThresholdKind; details: Record<string, unknown> }[];
  resolve: ThresholdKind[];
  events: { kind: EventKind; at: Date; details: Record<string, unknown> }[];
  evaluatedUntil: Date | null;
}

/** No sample for longer than this is a silence (same threshold as the console heartbeat). */
export const SILENCE_MS = 5 * 60_000;
/** An alert resolves this many points under its threshold, so a value hovering on it does not flap. */
export const HYSTERESIS_PCT = 5;
/** A window is judged only with at least this share of its expected one-per-minute samples. */
const MIN_COVERAGE = 0.8;
const TRAFFIC_WINDOW_MIN = 15;

/** Largest window the evaluation looks back over, in minutes. */
export const windowMinutes = (s: AlertSettings) => Math.max(s.cpu_minutes, s.ram_minutes, TRAFFIC_WINDOW_MIN);

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Samples of the last `minutes`, or null when too few to judge. */
function windowOf(input: AlertInput, minutes: number): AlertSample[] | null {
  const from = input.now.getTime() - minutes * 60_000;
  const w = input.samples.filter((s) => s.sampledAt.getTime() > from);
  return w.length >= Math.ceil(minutes * MIN_COVERAGE) ? w : null;
}

/** Level of each threshold metric now: value, threshold and whether it is above / clearly back under. */
interface Level {
  kind: ThresholdKind;
  above: boolean;
  below: boolean;
  details: Record<string, unknown>;
}

function levels(input: AlertInput): Level[] {
  const { settings: s } = input;
  const out: Level[] = [];
  const latest = input.samples.at(-1);
  const fresh = latest && input.now.getTime() - latest.sampledAt.getTime() <= SILENCE_MS ? latest : null;

  const cpu = windowOf(input, s.cpu_minutes)?.map((x) => x.cpuPct).filter((v): v is number => v !== null);
  if (cpu?.length) {
    const avg = cpu.reduce((a, b) => a + b, 0) / cpu.length;
    out.push({ kind: "cpu_high", above: avg > s.cpu_pct, below: avg < s.cpu_pct - HYSTERESIS_PCT, details: { value: round1(avg), threshold: s.cpu_pct, minutes: s.cpu_minutes } });
  }
  const ram = windowOf(input, s.ram_minutes);
  if (ram && fresh) {
    const min = Math.min(...ram.map((x) => x.memPct));
    out.push({ kind: "ram_high", above: min > s.ram_pct, below: fresh.memPct < s.ram_pct - HYSTERESIS_PCT, details: { value: round1(fresh.memPct), threshold: s.ram_pct, minutes: s.ram_minutes } });
  }
  if (fresh && fresh.swapPct !== null) {
    out.push({ kind: "swap_high", above: fresh.swapPct > s.swap_pct, below: fresh.swapPct < s.swap_pct - HYSTERESIS_PCT, details: { value: round1(fresh.swapPct), threshold: s.swap_pct } });
  }
  if (fresh) {
    out.push({ kind: "disk_high", above: fresh.diskPct > s.disk_pct, below: fresh.diskPct < s.disk_pct - 2, details: { value: round1(fresh.diskPct), threshold: s.disk_pct } });
  }
  const traffic = windowOf(input, TRAFFIC_WINDOW_MIN);
  if (traffic && input.hourlyTrafficAvg !== null) {
    const bytes = traffic.reduce((a, x) => a + (x.netBytes ?? 0), 0);
    const limit = Math.max((input.hourlyTrafficAvg / 4) * s.traffic_factor, s.traffic_floor_mb * 1024 * 1024);
    out.push({ kind: "traffic_spike", above: bytes > limit, below: bytes <= limit, details: { bytes, limit: Math.round(limit), minutes: TRAFFIC_WINDOW_MIN } });
  }
  return out;
}

/** Events between consecutive samples newer than evaluatedUntil: silences, reboots, unexpected restarts. */
function events(input: AlertInput): AlertDecision["events"] {
  if (!input.evaluatedUntil) return [];
  const since = input.evaluatedUntil.getTime();
  const out: AlertDecision["events"] = [];
  for (let i = 1; i < input.samples.length; i++) {
    const prev = input.samples[i - 1]!;
    const cur = input.samples[i]!;
    if (cur.sampledAt.getTime() <= since) continue;
    const gap = cur.sampledAt.getTime() - prev.sampledAt.getTime();
    if (gap > SILENCE_MS) out.push({ kind: "silence", at: cur.sampledAt, details: { from: prev.sampledAt.toISOString(), to: cur.sampledAt.toISOString(), minutes: Math.round(gap / 60_000) } });
    if (cur.uptimeS < prev.uptimeS) {
      out.push({ kind: "reboot", at: cur.sampledAt, details: { booted_at: new Date(cur.sampledAt.getTime() - cur.uptimeS * 1000).toISOString() } });
    } else if (cur.workerStartedAt.getTime() !== prev.workerStartedAt.getTime() && cur.workerRelease !== null && cur.workerRelease === prev.workerRelease) {
      // Same release restarted: a crash or an OOM kill, not a deploy.
      out.push({ kind: "worker_restart", at: cur.sampledAt, details: { started_at: cur.workerStartedAt.toISOString(), release: cur.workerRelease } });
    }
  }
  return out;
}

/** Decides what to open, keep, resolve and record. A metric without enough data keeps its current state. */
export function evaluateAlerts(input: AlertInput): AlertDecision {
  const open = new Set(input.openKinds);
  const decision: AlertDecision = { open: [], keep: [], resolve: [], events: events(input), evaluatedUntil: input.samples.at(-1)?.sampledAt ?? input.evaluatedUntil };
  for (const l of levels(input)) {
    if (open.has(l.kind)) {
      if (l.below) decision.resolve.push(l.kind);
      else decision.keep.push({ kind: l.kind, details: l.details });
    } else if (l.above) decision.open.push({ kind: l.kind, details: l.details });
  }
  return decision;
}

const pct = (v: unknown) => `${String(v).replace(".", ",")}%`;
const mb = (v: unknown) => `${Math.round(Number(v) / 1024 / 1024)} MB`;

const LABELS: Record<AlertKind, string> = {
  cpu_high: "CPU alta",
  ram_high: "RAM quasi piena",
  swap_high: "Swap in uso",
  disk_high: "Disco quasi pieno",
  traffic_spike: "Traffico anomalo",
  silence: "VPS tornata dopo un silenzio",
  worker_restart: "Worker riavviato",
  reboot: "VPS riavviata",
};

/** Push text for sysadmins (Italian UI copy). */
export function alertMessage(kind: AlertKind, phase: "open" | "resolved" | "event", d: Record<string, unknown>): { title: string; body: string } {
  if (phase === "resolved") return { title: `VPS: ${LABELS[kind]} rientrato`, body: "Il valore è tornato sotto la soglia." };
  const title = `VPS: ${LABELS[kind]}`;
  switch (kind) {
    case "cpu_high":
      return { title, body: `CPU media ${pct(d.value)} negli ultimi ${d.minutes} minuti (soglia ${pct(d.threshold)}).` };
    case "ram_high":
      return { title, body: `RAM al ${pct(d.value)} da almeno ${d.minutes} minuti (soglia ${pct(d.threshold)}).` };
    case "swap_high":
      return { title, body: `Swap al ${pct(d.value)} (soglia ${pct(d.threshold)}).` };
    case "disk_high":
      return { title, body: `Disco al ${pct(d.value)} (soglia ${pct(d.threshold)}).` };
    case "traffic_spike":
      return { title, body: `${mb(d.bytes)} negli ultimi ${d.minutes} minuti, oltre il limite di ${mb(d.limit)}.` };
    case "silence":
      return { title, body: `Nessun campione per ${d.minutes} minuti: VPS o worker sono rimasti fermi.` };
    case "worker_restart":
      return { title, body: "Il worker si è riavviato senza un nuovo rilascio (crash o memoria esaurita)." };
    case "reboot":
      return { title, body: "La macchina è stata riavviata." };
  }
}
