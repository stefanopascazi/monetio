import { backupKeys, manualKey } from "../backup/keys.ts";
import type { BackupStore, ListBackups } from "../backup/listing.ts";
import { errorMessage } from "../logger.ts";
import { pgEnvFromUrl } from "../../../../scripts/db/pg-env.ts";
import type { PipelineStep, RunPipeline } from "../../../../scripts/db/pipeline.ts";
import { dailyDue } from "./schedule.ts";
import type { Job, JobContext } from "./types.ts";

export interface BackupConfig {
  databaseUrl: string;
  /** rclone destination, e.g. "r2:monetio-backups" (remote configured via RCLONE_CONFIG_R2_* env). */
  remote: string;
  /** age public key ("age1..."); the private key never touches the VPS. */
  ageRecipient: string;
}

/** Hour (UTC) after which the daily backup runs: 01:00 UTC is 02:00/03:00 in Italy. */
export const BACKUP_HOUR_UTC = 1;

/** rclone with no config file: the remote comes from environment variables only. */
const rclone = (...args: string[]): PipelineStep => ({ cmd: "rclone", args: ["--config", "", ...args] });

/** pg_dump | zstd | age | rclone rcat: streamed to off-site storage without local files. */
export function backupSteps(config: BackupConfig, key: string): PipelineStep[] {
  return [
    {
      cmd: "pg_dump",
      // App data and login users; Supabase-managed schemas are recreated with the project.
      args: ["--format=custom", "--compress=0", "--schema=public", "--schema=auth", "--no-owner", "--no-privileges"],
      env: pgEnvFromUrl(config.databaseUrl),
    },
    { cmd: "zstd", args: ["-3", "-T1", "-q", "-c"] },
    { cmd: "age", args: ["--encrypt", "--recipient", config.ageRecipient] },
    rclone("rcat", `${config.remote}/${key}`),
  ];
}

/** Refreshes the console's list of backups (#105). */
export interface BackupListing {
  store: BackupStore;
  list: ListBackups;
}

const refresh = async ({ store, list }: BackupListing) => store.replaceObjects(await list());

/** After an upload the list is refreshed too; a listing failure never fails the backup itself. */
async function refreshAfterUpload(listing: BackupListing | undefined, log: JobContext["log"]) {
  if (!listing) return;
  try {
    await refresh(listing);
  } catch (error) {
    log("warn", "backup list refresh failed", { error: errorMessage(error) });
  }
}

export function createBackupJob(config: BackupConfig, run: RunPipeline, listing?: BackupListing): Job {
  return {
    name: "backup",
    intervalMs: 15 * 60_000,
    timeoutMs: 30 * 60_000,
    isDue: dailyDue(BACKUP_HOUR_UTC),
    async run({ log, signal, now }) {
      const keys = backupKeys(now);
      await run(backupSteps(config, keys.daily), signal);
      // Weekly/monthly copies are server-side: no second dump, no extra upload.
      for (const copy of keys.copies) {
        await run([rclone("copyto", `${config.remote}/${keys.daily}`, `${config.remote}/${copy}`)], signal);
      }
      log("info", "backup uploaded", { key: keys.daily, copies: keys.copies });
      await refreshAfterUpload(listing, log);
    },
  };
}

/**
 * On-demand backup asked from the console (#105), into manual/. A job of its own: its successes must
 * not count as the daily backup (dailyDue reads the last success of the job).
 */
export function createManualBackupJob(config: BackupConfig, run: RunPipeline, listing: BackupListing): Job {
  return {
    name: "backup-manual",
    intervalMs: 60_000,
    timeoutMs: 30 * 60_000,
    isDue: () => listing.store.hasPendingRequest(),
    async run({ log, signal, now }) {
      const requestId = await listing.store.claimRequest();
      if (requestId === null) return;
      const key = manualKey(now);
      try {
        await run(backupSteps(config, key), signal);
      } catch (error) {
        await listing.store.finishRequest(requestId, errorMessage(error), null);
        throw error;
      }
      await listing.store.finishRequest(requestId, null, { key });
      log("info", "manual backup uploaded", { key, requestId });
      await refreshAfterUpload(listing, log);
    },
  };
}

/** Hourly snapshot of the bucket, so the console also sees expired and copied files. */
export function createBackupListJob(listing: BackupListing): Job {
  return {
    name: "backup-list",
    intervalMs: 15 * 60_000,
    timeoutMs: 5 * 60_000,
    isDue: (last, now) => !last || now.getTime() - last.getTime() >= 3_600_000,
    async run({ log }) {
      await refresh(listing);
      log("info", "backup list refreshed");
    },
  };
}
