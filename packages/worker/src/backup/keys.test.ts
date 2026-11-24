import { describe, expect, it } from "vitest";
import { backupKeys, manualKey } from "./keys.ts";

describe("backupKeys", () => {
  it("names a weekday backup under daily/ only", () => {
    // Tuesday
    expect(backupKeys(new Date("2026-11-10T01:00:12.345Z"))).toEqual({
      daily: "daily/monetio-2026-11-10T0100Z.dump.zst.age",
      copies: [],
    });
  });

  it("adds a weekly copy on Sunday", () => {
    expect(backupKeys(new Date("2026-11-15T01:00:00Z")).copies).toEqual(["weekly/monetio-2026-11-15T0100Z.dump.zst.age"]);
  });

  it("adds a monthly copy on the 1st", () => {
    expect(backupKeys(new Date("2026-12-01T01:00:00Z")).copies).toEqual(["monthly/monetio-2026-12-01T0100Z.dump.zst.age"]);
  });

  it("adds both copies when the 1st is a Sunday", () => {
    expect(backupKeys(new Date("2026-11-01T01:00:00Z")).copies).toHaveLength(2);
  });
});

describe("manualKey", () => {
  it("names an on-demand backup under manual/, to the minute", () => {
    expect(manualKey(new Date("2026-11-24T15:42:10.123Z"))).toBe("manual/monetio-2026-11-24T1542Z.dump.zst.age");
  });
});
