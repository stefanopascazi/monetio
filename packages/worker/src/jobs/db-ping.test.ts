import type { Sql } from "postgres";
import { describe, expect, it, vi } from "vitest";
import { createDbPingJob } from "./db-ping.ts";

const ctx = { log: vi.fn(), signal: new AbortController().signal };
const fakeSql = (rows: unknown[]) => vi.fn(async () => rows) as unknown as Sql;

describe("createDbPingJob", () => {
  it("passes when the database answers", async () => {
    await expect(createDbPingJob(fakeSql([{ ok: 1 }])).run(ctx)).resolves.toBeUndefined();
  });

  it("fails on an unexpected answer", async () => {
    await expect(createDbPingJob(fakeSql([])).run(ctx)).rejects.toThrow(/unexpected/);
  });
});
