import { describe, expect, it } from "vitest";
import { backupAgeHours, parseBackupListing, pickBackup } from "./backups.ts";

const LISTING = [
  "daily/monetio-2026-11-21T0100Z.dump.zst.age",
  "weekly/monetio-2026-11-22T0100Z.dump.zst.age",
  "daily/monetio-2026-11-22T0100Z.dump.zst.age",
  "monthly/monetio-2026-11-01T0100Z.dump.zst.age",
  "daily/notes.txt",
  "",
].join("\r\n");

describe("parseBackupListing", () => {
  it("keeps backups only, newest first, daily before its copies", () => {
    expect(parseBackupListing(LISTING).map((e) => e.key)).toEqual([
      "daily/monetio-2026-11-22T0100Z.dump.zst.age",
      "weekly/monetio-2026-11-22T0100Z.dump.zst.age",
      "daily/monetio-2026-11-21T0100Z.dump.zst.age",
      "monthly/monetio-2026-11-01T0100Z.dump.zst.age",
    ]);
  });

  it("reads the timestamp from the key as UTC", () => {
    expect(parseBackupListing("daily/monetio-2026-11-10T0130Z.dump.zst.age")[0].takenAt.toISOString()).toBe("2026-11-10T01:30:00.000Z");
  });
});

describe("pickBackup", () => {
  const entries = parseBackupListing(LISTING);

  it("picks the newest for latest", () => {
    expect(pickBackup(entries, "latest").key).toBe("daily/monetio-2026-11-22T0100Z.dump.zst.age");
  });

  it("picks a day or an exact key", () => {
    expect(pickBackup(entries, "2026-11-01").key).toBe("monthly/monetio-2026-11-01T0100Z.dump.zst.age");
    expect(pickBackup(entries, "weekly/monetio-2026-11-22T0100Z.dump.zst.age").key).toBe("weekly/monetio-2026-11-22T0100Z.dump.zst.age");
  });

  it("fails on unknown selectors and empty storage", () => {
    expect(() => pickBackup(entries, "2020-01-01")).toThrow(/non trovato/);
    expect(() => pickBackup([], "latest")).toThrow(/Nessun backup/);
  });
});

describe("backupAgeHours", () => {
  it("counts whole hours", () => {
    const [entry] = parseBackupListing("daily/monetio-2026-11-22T0100Z.dump.zst.age");
    expect(backupAgeHours(entry, new Date("2026-11-23T00:59:00Z"))).toBe(23);
  });
});
