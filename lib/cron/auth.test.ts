import { describe, expect, it } from "vitest";
import { isAuthorizedCron } from "./auth";

describe("isAuthorizedCron", () => {
  it("accepts only the exact bearer secret", () => {
    expect(isAuthorizedCron("Bearer s3cret", "s3cret")).toBe(true);
    expect(isAuthorizedCron("Bearer wrong!", "s3cret")).toBe(false);
    expect(isAuthorizedCron(null, "s3cret")).toBe(false);
  });

  it("rejects everything when no secret is configured", () => {
    expect(isAuthorizedCron("Bearer ", undefined)).toBe(false);
    expect(isAuthorizedCron("Bearer x", "")).toBe(false);
  });
});
