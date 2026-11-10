import { describe, expect, it, vi } from "vitest";
import { createHeartbeat, pingUrl } from "./heartbeat.ts";

describe("pingUrl", () => {
  it("builds Healthchecks.io event URLs", () => {
    expect(pingUrl("https://hc-ping.com/abc/", "success")).toBe("https://hc-ping.com/abc");
    expect(pingUrl("https://hc-ping.com/abc", "start")).toBe("https://hc-ping.com/abc/start");
    expect(pingUrl("https://hc-ping.com/abc", "fail")).toBe("https://hc-ping.com/abc/fail");
  });
});

describe("createHeartbeat", () => {
  it("posts to the job URL", async () => {
    const fetchFn = vi.fn(async () => new Response());
    await createHeartbeat({ HEALTHCHECK_URL_JOB: "https://hc/1" }, () => {}, fetchFn).ping("job", "fail", "boom");
    expect(fetchFn).toHaveBeenCalledWith("https://hc/1/fail", expect.objectContaining({ method: "POST", body: "boom" }));
  });

  it("skips jobs without a URL", async () => {
    const fetchFn = vi.fn(async () => new Response());
    await createHeartbeat({}, () => {}, fetchFn).ping("job", "start");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("swallows network errors", async () => {
    const onError = vi.fn();
    const fetchFn = vi.fn(async () => {
      throw new Error("offline");
    });
    await expect(createHeartbeat({ HEALTHCHECK_URL_JOB: "https://hc/1" }, onError, fetchFn).ping("job", "success")).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledWith("job", expect.any(Error));
  });
});
