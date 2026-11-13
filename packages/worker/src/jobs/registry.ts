import type { Sql } from "postgres";
import { runPipeline } from "../backup/pipeline.ts";
import type { WorkerConfig } from "../config.ts";
import { createAdvisorPurgeJob, createPostgresAdvisorPurgeStore } from "./advisor-purge.ts";
import { createBackupJob } from "./backup.ts";
import { createDbPingJob } from "./db-ping.ts";
import { createPushDeliverJob } from "./push-deliver.ts";
import { createNotifyEventsJob } from "./notify-events.ts";
import { createOutboxWriter } from "../notify/outbox.ts";
import { listRecipients, loadSnapshot } from "../notify/snapshot.ts";
import { createWebPushSender } from "../push/sender.ts";
import { createPostgresPushStore } from "../push/store.ts";
import type { Job } from "./types.ts";

/** Every scheduled job. New jobs (#38 PSD2, #36 imports, #47 checks) register here. */
export function createJobs(sql: Sql, config: WorkerConfig): Job[] {
  const jobs: Job[] = [createDbPingJob(sql)];
  if (config.backup) jobs.push(createBackupJob({ databaseUrl: config.databaseUrl, ...config.backup }, runPipeline));
  if (config.push) jobs.push(createPushDeliverJob(createPostgresPushStore(sql), createWebPushSender(config.push)));
  // The bell needs notifications even without push keys.
  jobs.push(
    createNotifyEventsJob({
      listRecipients: () => listRecipients(sql),
      loadSnapshot: (r, today) => loadSnapshot(sql, r, today),
      insert: createOutboxWriter(sql),
    }),
  );
  jobs.push(createAdvisorPurgeJob(createPostgresAdvisorPurgeStore(sql)));
  return jobs;
}
