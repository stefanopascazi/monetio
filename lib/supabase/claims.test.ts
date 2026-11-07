import { describe, expect, it } from "vitest";
import { sessionUser } from "./claims";

describe("sessionUser", () => {
  it("maps subject and email", () => {
    expect(sessionUser({ sub: "u1", email: "a@b.it" })).toEqual({ id: "u1", email: "a@b.it" });
  });

  it("keeps the user without an email", () => {
    expect(sessionUser({ sub: "u1" })).toEqual({ id: "u1", email: null });
    expect(sessionUser({ sub: "u1", email: "" })).toEqual({ id: "u1", email: null });
  });

  it("returns null without a valid subject", () => {
    expect(sessionUser(null)).toBeNull();
    expect(sessionUser(undefined)).toBeNull();
    expect(sessionUser({})).toBeNull();
    expect(sessionUser({ sub: "" })).toBeNull();
    expect(sessionUser({ sub: 42 })).toBeNull();
  });
});
