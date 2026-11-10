import type { Sql } from "postgres";
import { createDbPingJob } from "./db-ping.ts";
import type { Job } from "./types.ts";

/** Every scheduled job. New jobs (#28 push, #38 PSD2, #36 imports, #47 checks, #48 backup) register here. */
export function createJobs(sql: Sql): Job[] {
  return [createDbPingJob(sql)];
}
