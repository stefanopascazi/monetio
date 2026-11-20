import { describe, expect, it } from "vitest";
import { parseGrantArgs } from "./grant-args";

describe("parseGrantArgs", () => {
  it("normalizes the email", () => {
    expect(parseGrantArgs(["  Me@Example.COM "], false)).toEqual({ email: "me@example.com", revoke: false });
  });

  it("keeps the revoke flag", () => {
    expect(parseGrantArgs(["me@example.com"], true).revoke).toBe(true);
  });

  it("rejects a missing or invalid email", () => {
    expect(() => parseGrantArgs([], false)).toThrow(/email/);
    expect(() => parseGrantArgs(["not-an-email"], false)).toThrow(/email/);
  });
});
