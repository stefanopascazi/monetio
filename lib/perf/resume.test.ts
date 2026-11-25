import { describe, expect, it } from "vitest";
import { RESUME_REFRESH_MS, shouldRefreshOnResume } from "./resume";

describe("shouldRefreshOnResume", () => {
  it("refreshes only after a long enough pause", () => {
    expect(shouldRefreshOnResume(null, 10_000_000)).toBe(false);
    expect(shouldRefreshOnResume(0, RESUME_REFRESH_MS - 1)).toBe(false);
    expect(shouldRefreshOnResume(0, RESUME_REFRESH_MS)).toBe(true);
    expect(shouldRefreshOnResume(0, 50, 50)).toBe(true);
  });
});
