import { backupKeys } from "../backup/keys.ts";
import { pgEnvFromUrl } from "../backup/pg-env.ts";
import type { PipelineStep, RunPipeline } from "../backup/pipeline.ts";
import { dailyDue } from "./schedule.ts";
import type { Job } from "./types.ts";

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

export function createBackupJob(config: BackupConfig, run: RunPipeline): Job {
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
    },
  };
}
