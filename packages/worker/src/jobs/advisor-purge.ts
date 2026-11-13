import type { Sql } from "postgres";
import type { Job } from "./types.ts";

/** Advisor texts are kept this long (privacy), the metrics forever. */
export const ADVISOR_RETENTION_DAYS = 30;

export interface AdvisorPurgeStore {
  /** Clears question, answer and verdict of requests older than `before`; returns the rows touched. */
  clearTexts(before: Date): Promise<number>;
  /** Deletes conversations untouched since `before`; returns how many. */
  deleteConversations(before: Date): Promise<number>;
}

export function createPostgresAdvisorPurgeStore(sql: Sql): AdvisorPurgeStore {
  return {
    async clearTexts(before) {
      const rows = await sql`
        update advisor_requests set question = null, answer = null, verdict = null
        where created_at < ${before} and (question is not null or answer is not null or verdict is not null)
        returning id`;
      return rows.length;
    },
    async deleteConversations(before) {
      const rows = await sql`delete from advisor_conversations where updated_at < ${before} returning id`;
      return rows.length;
    },
  };
}

/** Daily cleanup of the AI advisor log: texts and conversations go after 30 days, tokens and cost stay. */
export function createAdvisorPurgeJob(store: AdvisorPurgeStore): Job {
  return {
    name: "advisor-purge",
    intervalMs: 60 * 60_000,
    timeoutMs: 5 * 60_000,
    isDue: (last, now) => !last || now.getTime() - last.getTime() >= 24 * 3_600_000,
    async run(ctx) {
      const before = new Date(ctx.now.getTime() - ADVISOR_RETENTION_DAYS * 86_400_000);
      const texts = await store.clearTexts(before);
      const conversations = await store.deleteConversations(before);
      if (texts || conversations) ctx.log("info", "advisor purged", { texts, conversations });
    },
  };
}
