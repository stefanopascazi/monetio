import { describe, expect, it, vi } from "vitest";
import { ADVISOR_RETENTION_DAYS, createAdvisorPurgeJob } from "./advisor-purge.ts";

const now = new Date("2026-12-31T03:00:00Z");
const ctx = () => ({ log: vi.fn(), signal: new AbortController().signal, now });

describe("createAdvisorPurgeJob", () => {
  it("clears texts and conversations older than the retention", async () => {
    const store = { clearTexts: vi.fn(async () => 3), deleteConversations: vi.fn(async () => 1) };
    const c = ctx();
    await createAdvisorPurgeJob(store).run(c);
    const cutoff = new Date(now.getTime() - ADVISOR_RETENTION_DAYS * 86_400_000);
    expect(store.clearTexts).toHaveBeenCalledWith(cutoff);
    expect(store.deleteConversations).toHaveBeenCalledWith(cutoff);
    expect(c.log).toHaveBeenCalledWith("info", "advisor purged", { texts: 3, conversations: 1 });
  });

  it("stays quiet when there is nothing to purge", async () => {
    const c = ctx();
    await createAdvisorPurgeJob({ clearTexts: async () => 0, deleteConversations: async () => 0 }).run(c);
    expect(c.log).not.toHaveBeenCalled();
  });

  it("runs once a day", () => {
    const job = createAdvisorPurgeJob({ clearTexts: async () => 0, deleteConversations: async () => 0 });
    expect(job.isDue!(null, now)).toBe(true);
    expect(job.isDue!(new Date(now.getTime() - 23 * 3_600_000), now)).toBe(false);
    expect(job.isDue!(new Date(now.getTime() - 24 * 3_600_000), now)).toBe(true);
  });
});
