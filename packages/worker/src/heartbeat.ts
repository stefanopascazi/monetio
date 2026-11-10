import { heartbeatEnvName } from "./config.ts";

export type HeartbeatEvent = "start" | "success" | "fail";

export interface Heartbeat {
  ping(job: string, event: HeartbeatEvent, body?: string): Promise<void>;
}

/** Healthchecks.io ping URL for an event: `<url>/start`, `<url>`, `<url>/fail`. */
export function pingUrl(base: string, event: HeartbeatEvent): string {
  const url = base.replace(/\/$/, "");
  return event === "success" ? url : `${url}/${event}`;
}

/**
 * Pings the external monitor; a missing URL or a network error never fails the job,
 * the monitor itself alerts when pings stop arriving.
 */
export function createHeartbeat(
  /** Keyed by env variable name, as parsed by parseConfig. */
  urls: Record<string, string>,
  onError: (job: string, error: unknown) => void,
  fetchFn: typeof fetch = fetch,
): Heartbeat {
  return {
    async ping(job, event, body) {
      const base = urls[heartbeatEnvName(job)];
      if (!base) return;
      try {
        await fetchFn(pingUrl(base, event), { method: "POST", body: body?.slice(0, 10_000), signal: AbortSignal.timeout(10_000) });
      } catch (error) {
        onError(job, error);
      }
    },
  };
}
