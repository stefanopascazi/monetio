import { describe, expect, it, vi } from "vitest";
import { parseListing, rcloneLister } from "./listing.ts";

const listing = JSON.stringify([
  { Path: "daily/monetio-2026-11-24T0100Z.dump.zst.age", Size: 1234, ModTime: "2026-11-24T01:00:42.1Z" },
  { Path: "manual/monetio-2026-11-24T1542Z.dump.zst.age", Size: 99, ModTime: "2026-11-24T15:42:30Z" },
  { Path: "notes.txt", Size: 1, ModTime: "2026-11-24T00:00:00Z" },
  { Path: "daily/bad name.age", Size: 1, ModTime: "2026-11-24T00:00:00Z" },
  { Path: "weekly/x.age", Size: -1, ModTime: "2026-11-24T00:00:00Z" },
  { Path: "monthly/y.age", Size: 1, ModTime: "not a date" },
]);

describe("parseListing", () => {
  it("keeps backups under the known prefixes with size and date", () => {
    expect(parseListing(listing)).toEqual([
      { key: "daily/monetio-2026-11-24T0100Z.dump.zst.age", sizeBytes: 1234, modifiedAt: new Date("2026-11-24T01:00:42.1Z") },
      { key: "manual/monetio-2026-11-24T1542Z.dump.zst.age", sizeBytes: 99, modifiedAt: new Date("2026-11-24T15:42:30Z") },
    ]);
  });

  it("reads an empty bucket", () => {
    expect(parseListing("[]")).toEqual([]);
  });
});

describe("rcloneLister", () => {
  it("lists every file of the remote recursively, with no config file", async () => {
    const capture = vi.fn(async () => listing);
    expect(await rcloneLister("r2:bucket", capture)()).toHaveLength(2);
    expect(capture).toHaveBeenCalledWith("rclone", ["--config", "", "lsjson", "-R", "--files-only", "r2:bucket"]);
  });
});
