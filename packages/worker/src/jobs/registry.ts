import type { Sql } from "postgres";
import { runPipeline } from "../../../../scripts/db/pipeline.ts";
import type { WorkerConfig } from "../config.ts";
import { createAdvisorPurgeJob, createPostgresAdvisorPurgeStore } from "./advisor-purge.ts";
import { capture } from "../../../../scripts/db/restore/tools.ts";
import { createPostgresBackupStore, rcloneLister } from "../backup/listing.ts";
import { createBackupJob, createBackupListJob, createManualBackupJob } from "./backup.ts";
import { createBankSyncJob } from "./bank-sync.ts";
import { createPostgresBankSyncStore } from "../bank/store.ts";
import { createDbPingJob } from "./db-ping.ts";
import { createPushDeliverJob } from "./push-deliver.ts";
import { createJobRunsPurgeJob, createPostgresJobRunStore } from "./runs.ts";
import { createIntegrityCheckJob, createPostgresIntegrityStore } from "./integrity-check.ts";
import { createNotifyEventsJob } from "./notify-events.ts";
import { createOutboxWriter } from "../notify/outbox.ts";
import { listRecipients, loadSnapshot } from "../notify/snapshot.ts";
import { createWebPushSender } from "../push/sender.ts";
import { createPostgresPushStore } from "../push/store.ts";
import type { Job } from "./types.ts";

/** Every scheduled job. New jobs (#38 PSD2, #36 imports, #47 checks) register here. */
export function createJobs(sql: Sql, config: WorkerConfig): Job[] {
  const jobs: Job[] = [createDbPingJob(sql)];
  if (config.backup) {
    const backup = { databaseUrl: config.databaseUrl, ...config.backup };
    const listing = { store: createPostgresBackupStore(sql), list: rcloneLister(config.backup.remote, capture) };
    jobs.push(createBackupJob(backup, runPipeline, listing), createManualBackupJob(backup, runPipeline, listing), createBackupListJob(listing));
  }
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
  jobs.push(createJobRunsPurgeJob(createPostgresJobRunStore(sql)));
  jobs.push(createIntegrityCheckJob(createPostgresIntegrityStore(sql)));
  if (config.bankKeys) jobs.push(createBankSyncJob({ store: createPostgresBankSyncStore(sql), masterKey: config.bankKeys }));
  return jobs;
}
