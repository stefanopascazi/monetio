import type { Sql } from "postgres";
import { runPipeline } from "../backup/pipeline.ts";
import type { WorkerConfig } from "../config.ts";
import { createBackupJob } from "./backup.ts";
import { createDbPingJob } from "./db-ping.ts";
import type { Job } from "./types.ts";

/** Every scheduled job. New jobs (#28 push, #38 PSD2, #36 imports, #47 checks) register here. */
export function createJobs(sql: Sql, config: WorkerConfig): Job[] {
  const jobs: Job[] = [createDbPingJob(sql)];
  if (config.backup) jobs.push(createBackupJob({ databaseUrl: config.databaseUrl, ...config.backup }, runPipeline));
  return jobs;
}
