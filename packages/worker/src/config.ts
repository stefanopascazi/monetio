export interface WorkerConfig {
  databaseUrl: string;
  /** How often the scheduler checks for due jobs. */
  tickMs: number;
  /** Healthchecks.io ping URLs keyed by env variable name (see heartbeatEnvName). */
  heartbeatUrls: Record<string, string>;
}

const HEARTBEAT_PREFIX = "HEALTHCHECK_URL_";

/** "db-ping" -> "HEALTHCHECK_URL_DB_PING". */
export function heartbeatEnvName(jobName: string): string {
  return HEARTBEAT_PREFIX + jobName.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

export function parseConfig(env: Record<string, string | undefined>): WorkerConfig {
  const databaseUrl = env.POSTGRES_URL_NON_POOLING ?? env.POSTGRES_URL;
  if (!databaseUrl) throw new Error("POSTGRES_URL_NON_POOLING is not set");

  const tickMs = env.WORKER_TICK_MS ? Number(env.WORKER_TICK_MS) : 30_000;
  if (!Number.isInteger(tickMs) || tickMs < 1_000) throw new Error(`Invalid WORKER_TICK_MS: ${env.WORKER_TICK_MS}`);

  const heartbeatUrls: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith(HEARTBEAT_PREFIX) && value) heartbeatUrls[key] = value;
  }
  return { databaseUrl, tickMs, heartbeatUrls };
}
