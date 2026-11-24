import { describe, expect, it, vi } from "vitest";
import type { RunPipeline } from "../../../../scripts/db/pipeline.ts";
import type { BackupObject, BackupStore } from "../backup/listing.ts";
import { backupSteps, createBackupJob, createBackupListJob, createManualBackupJob } from "./backup.ts";

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

const objects: BackupObject[] = [{ key: "daily/a.dump.zst.age", sizeBytes: 10, modifiedAt: new Date("2026-11-24T01:00:00Z") }];
function listing(pending: number | null = 7) {
  const store = {
    replaceObjects: vi.fn<BackupStore["replaceObjects"]>(async () => {}),
    hasPendingRequest: vi.fn(async () => pending !== null),
    claimRequest: vi.fn(async () => pending),
    finishRequest: vi.fn<BackupStore["finishRequest"]>(async () => {}),
  };
  return { store, list: vi.fn(async () => objects) };
}

describe("backup list refresh", () => {
  it("refreshes the list after the daily upload, without failing on a listing error", async () => {
    const l = listing();
    await createBackupJob(config, vi.fn(async () => {}), l).run(ctx("2026-11-10T01:00:00Z"));
    expect(l.store.replaceObjects).toHaveBeenCalledWith(objects);

    const broken = { ...l, list: vi.fn(async () => Promise.reject(new Error("403"))) };
    const c = ctx("2026-11-10T01:00:00Z");
    await expect(createBackupJob(config, vi.fn(async () => {}), broken).run(c)).resolves.toBeUndefined();
    expect(c.log).toHaveBeenCalledWith("warn", "backup list refresh failed", { error: "403" });
  });

  it("lists the bucket every hour", async () => {
    const l = listing();
    const job = createBackupListJob(l);
    expect(job.isDue?.(null, new Date())).toBe(true);
    expect(job.isDue?.(new Date("2026-11-24T10:00:00Z"), new Date("2026-11-24T10:30:00Z"))).toBe(false);
    expect(job.isDue?.(new Date("2026-11-24T10:00:00Z"), new Date("2026-11-24T11:00:00Z"))).toBe(true);
    await job.run(ctx("2026-11-24T11:00:00Z"));
    expect(l.store.replaceObjects).toHaveBeenCalledWith(objects);
  });
});

describe("createManualBackupJob", () => {
  it("is due only while the console has a pending request", async () => {
    expect(await createManualBackupJob(config, vi.fn(), listing(7)).isDue?.(null, new Date())).toBe(true);
    expect(await createManualBackupJob(config, vi.fn(), listing(null)).isDue?.(null, new Date())).toBe(false);
  });

  it("uploads to manual/, records the key on the request and refreshes the list", async () => {
    const l = listing(7);
    const run = vi.fn<RunPipeline>(async () => {});
    await createManualBackupJob(config, run, l).run(ctx("2026-11-24T15:42:10Z"));
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0][0][3].args.at(-1)).toBe("r2:bucket/manual/monetio-2026-11-24T1542Z.dump.zst.age");
    expect(l.store.finishRequest).toHaveBeenCalledWith(7, null, { key: "manual/monetio-2026-11-24T1542Z.dump.zst.age" });
    expect(l.store.replaceObjects).toHaveBeenCalled();
  });

  it("does nothing when another run already took the request", async () => {
    const run = vi.fn<RunPipeline>(async () => {});
    await createManualBackupJob(config, run, listing(null)).run(ctx("2026-11-24T15:42:10Z"));
    expect(run).not.toHaveBeenCalled();
  });

  it("closes the request with the error and fails the run", async () => {
    const l = listing(7);
    const run = vi.fn<RunPipeline>(async () => Promise.reject(new Error("pg_dump exited with 1")));
    await expect(createManualBackupJob(config, run, l).run(ctx("2026-11-24T15:42:10Z"))).rejects.toThrow("pg_dump");
    expect(l.store.finishRequest).toHaveBeenCalledWith(7, "pg_dump exited with 1", null);
    expect(l.store.replaceObjects).not.toHaveBeenCalled();
  });
});
