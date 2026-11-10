export interface WorkerConfig {
  databaseUrl: string;
  /** How often the scheduler checks for due jobs. */
  tickMs: number;
  /** Healthchecks.io ping URLs keyed by env variable name (see heartbeatEnvName). */
  heartbeatUrls: Record<string, string>;
  /** Off-site backup target; null keeps the backup job disabled. */
  backup: { remote: string; ageRecipient: string } | null;
  /** Sentry DSN; null keeps error reporting off. */
  sentryDsn: string | null;
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
  return { databaseUrl, tickMs, heartbeatUrls, backup: parseBackup(env), sentryDsn: env.SENTRY_DSN || null };
}

function parseBackup(env: Record<string, string | undefined>): WorkerConfig["backup"] {
  const remote = env.BACKUP_REMOTE;
  const ageRecipient = env.BACKUP_AGE_RECIPIENT;
  if (!remote && !ageRecipient) return null;
  if (!remote || !ageRecipient) throw new Error("BACKUP_REMOTE and BACKUP_AGE_RECIPIENT must be set together");
  if (!ageRecipient.startsWith("age1")) throw new Error("BACKUP_AGE_RECIPIENT must be an age public key (age1...)");
  return { remote: remote.replace(/\/$/, ""), ageRecipient };
}
