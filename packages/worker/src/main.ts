// Worker entry point (systemd service on the VPS): schedules jobs one at a time until SIGTERM.
import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import postgres from "postgres";
import { cleanUrl, sslFor } from "../../../scripts/db/ssl.ts";
import { parseConfig } from "./config.ts";
import { createHeartbeat } from "./heartbeat.ts";
import { createPostgresLockStore } from "./jobs/lock.ts";
import { createJobs } from "./jobs/registry.ts";
import { runJob } from "./jobs/run-job.ts";
import { createLogger, errorMessage } from "./logger.ts";
import { createSerialQueue } from "./scheduler/queue.ts";
import { createScheduler } from "./scheduler/scheduler.ts";

/** Grace period for the running job before exiting anyway (systemd TimeoutStopSec is longer). */
const SHUTDOWN_GRACE_MS = 20_000;

const log = createLogger();
const config = parseConfig(process.env);
const sql = postgres(cleanUrl(config.databaseUrl), { ssl: sslFor(config.databaseUrl), max: 2, onnotice: () => {} });
const jobs = createJobs(sql, config);

const shutdown = new AbortController();
const queue = createSerialQueue((job, error) => log("error", "unhandled job error", { job, error: errorMessage(error) }));
const deps = {
  locks: createPostgresLockStore(sql),
  heartbeat: createHeartbeat(config.heartbeatUrls, (job, error) => log("warn", "heartbeat failed", { job, error: errorMessage(error) })),
  log,
  holder: `${hostname()}:${process.pid}:${randomUUID().slice(0, 8)}`,
  shutdown: shutdown.signal,
};
const scheduler = createScheduler({ jobs, queue, tickMs: config.tickMs, runJob: (job) => runJob(job, deps) });

async function stop(signal: string) {
  log("info", "worker stopping", { signal });
  scheduler.stop();
  shutdown.abort();
  await Promise.race([queue.idle(), new Promise((r) => setTimeout(r, SHUTDOWN_GRACE_MS))]);
  await sql.end({ timeout: 5 });
  process.exit(0);
}

process.once("SIGTERM", () => void stop("SIGTERM"));
process.once("SIGINT", () => void stop("SIGINT"));

log("info", "worker started", { jobs: jobs.map((j) => j.name), holder: deps.holder });
scheduler.start();
