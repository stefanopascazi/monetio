import { describe, expect, it } from "vitest";
import { LAST_ACCOUNT_COOKIE, LAST_ACCOUNT_MAX_AGE, lastAccountCookie } from "./last-account";

describe("lastAccountCookie", () => {
  it("builds a site-wide, long-lived cookie", () => {
    const c = lastAccountCookie("abc");
    expect(c.startsWith(`${LAST_ACCOUNT_COOKIE}=abc;`)).toBe(true);
    expect(c).toContain("path=/");
    expect(c).toContain(`max-age=${LAST_ACCOUNT_MAX_AGE}`);
  });
  it("encodes the value", () => {
    expect(lastAccountCookie("a b")).toContain("=a%20b;");
  });
});
