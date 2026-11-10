import { describe, expect, it, vi } from "vitest";
import type { RunPipeline } from "../backup/pipeline.ts";
import { backupSteps, createBackupJob } from "./backup.ts";

const config = { databaseUrl: "postgres://u:secret@db.example.com:5432/postgres", remote: "r2:bucket", ageRecipient: "age1xyz" };
const ctx = (iso: string) => ({ log: vi.fn(), signal: new AbortController().signal, now: new Date(iso) });

describe("backupSteps", () => {
  const steps = backupSteps(config, "daily/x.dump.zst.age");

  it("chains pg_dump, zstd, age and rclone", () => {
    expect(steps.map((s) => s.cmd)).toEqual(["pg_dump", "zstd", "age", "rclone"]);
  });

  it("dumps public and auth with the password in the environment only", () => {
    expect(steps[0].args).toEqual(expect.arrayContaining(["--schema=public", "--schema=auth", "--format=custom"]));
    expect(steps[0].env?.PGPASSWORD).toBe("secret");
    expect(steps.flatMap((s) => s.args).join(" ")).not.toContain("secret");
  });

  it("encrypts to the recipient and uploads to the key", () => {
    expect(steps[2].args).toEqual(["--encrypt", "--recipient", "age1xyz"]);
    expect(steps[3].args).toEqual(["--config", "", "rcat", "r2:bucket/daily/x.dump.zst.age"]);
  });
});

describe("createBackupJob", () => {
  it("is a daily job", () => {
    const job = createBackupJob(config, vi.fn());
    expect(job.isDue?.(new Date("2026-11-10T01:05:00Z"), new Date("2026-11-10T20:00:00Z"))).toBe(false);
    expect(job.isDue?.(new Date("2026-11-09T01:05:00Z"), new Date("2026-11-10T01:05:00Z"))).toBe(true);
  });

  it("uploads one dump on a weekday", async () => {
    const run = vi.fn<RunPipeline>(async () => {});
    await createBackupJob(config, run).run(ctx("2026-11-10T01:00:00Z"));
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("adds server-side copies on Sunday the 1st", async () => {
    const run = vi.fn<RunPipeline>(async () => {});
    await createBackupJob(config, run).run(ctx("2026-11-01T01:00:00Z"));
    expect(run).toHaveBeenCalledTimes(3);
    const copyArgs = run.mock.calls.slice(1).map((c) => c[0][0].args);
    expect(copyArgs[0]).toEqual(["--config", "", "copyto", "r2:bucket/daily/monetio-2026-11-01T0100Z.dump.zst.age", "r2:bucket/weekly/monetio-2026-11-01T0100Z.dump.zst.age"]);
    expect(copyArgs[1][4]).toBe("r2:bucket/monthly/monetio-2026-11-01T0100Z.dump.zst.age");
  });

  it("propagates pipeline failures", async () => {
    const run = vi.fn(async () => {
      throw new Error("rclone exited with 1");
    });
    await expect(createBackupJob(config, run).run(ctx("2026-11-10T01:00:00Z"))).rejects.toThrow("rclone");
  });
});
