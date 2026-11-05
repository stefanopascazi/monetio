import { describe, expect, it } from "vitest";
import { isValidEmail, normalizeEmail, parseInviteForm, safeNext } from "./invite";

const form = (data: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.set(k, v);
  return fd;
};

describe("invite form", () => {
  it("normalizes and validates email", () => {
    expect(normalizeEmail("  Foo@Bar.IT ")).toBe("foo@bar.it");
    expect(isValidEmail("a@b.it")).toBe(true);
    expect(isValidEmail("nope")).toBe(false);
  });

  it("accepts an existing pending member", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(parseInviteForm(form({ email: "A@b.it", memberId: id, displayName: "x" }))).toEqual({ ok: true, value: { email: "a@b.it", memberId: id, displayName: null } });
  });

  it("requires a name for a new member", () => {
    expect(parseInviteForm(form({ email: "a@b.it" }))).toEqual({ ok: false, errors: { displayName: "Scrivi il nome della persona" } });
  });
});

describe("safeNext", () => {
  it("allows only relative paths", () => {
    expect(safeNext("/auth/password")).toBe("/auth/password");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext(null, "/x")).toBe("/x");
  });
});
