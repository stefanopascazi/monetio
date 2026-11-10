import { describe, expect, it } from "vitest";
import { createLogger, errorMessage, formatLogLine } from "./logger.ts";

describe("formatLogLine", () => {
  it("serializes level, message and fields as one JSON line", () => {
    const line = formatLogLine("info", "job done", { job: "db-ping" }, new Date("2026-11-10T08:00:00Z"));
    expect(JSON.parse(line)).toEqual({ time: "2026-11-10T08:00:00.000Z", level: "info", message: "job done", job: "db-ping" });
  });
});

describe("createLogger", () => {
  it("writes formatted lines to the sink", () => {
    const lines: string[] = [];
    createLogger((l) => lines.push(l))("warn", "slow");
    expect(JSON.parse(lines[0])).toMatchObject({ level: "warn", message: "slow" });
  });
});

describe("errorMessage", () => {
  it("handles errors and other values", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage("plain")).toBe("plain");
  });
});
