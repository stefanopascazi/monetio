import { describe, expect, it } from "vitest";
import { checkHealth } from "./check";

describe("checkHealth", () => {
  it("is healthy when the probe resolves", async () => {
    expect(await checkHealth(async () => {})).toEqual({ ok: true, status: 200, db: "ok" });
  });

  it("is unhealthy when the probe fails", async () => {
    expect(await checkHealth(async () => Promise.reject(new Error("down")))).toEqual({ ok: false, status: 503, db: "error" });
  });

  it("is unhealthy when the probe hangs", async () => {
    expect(await checkHealth(() => new Promise(() => {}), 10)).toMatchObject({ ok: false, status: 503 });
  });
});
