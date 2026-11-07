import { describe, expect, it } from "vitest";
import { activeMembership, activeSession, sessionPayload } from "./session-context";

const member = (id: string, hh: string, user: string | null, created: string, role = "member") => ({
  id,
  household_id: hh,
  user_id: user,
  display_name: id.toUpperCase(),
  email: null,
  role,
  created_at: created,
});

const payload = sessionPayload({
  memberships: [member("m1", "h1", "u", "2026-01-01", "admin"), member("m2", "h2", "u", "2026-02-01")],
  households: [
    { id: "h1", name: "Casa", invite_code: "AAA" },
    { id: "h2", name: "Mare", invite_code: "BBB" },
  ],
  members: [member("m1", "h1", "u", "2026-01-01", "admin"), member("x1", "h1", "v", "2026-01-02"), member("m2", "h2", "u", "2026-02-01")],
});

describe("sessionPayload", () => {
  it("fills missing lists", () => {
    expect(sessionPayload(null)).toEqual({ memberships: [], households: [], members: [] });
    expect(sessionPayload({ memberships: [] }).members).toEqual([]);
  });
});

describe("activeMembership", () => {
  it("prefers the cookie household, else the oldest", () => {
    expect(activeMembership(payload, "h2")?.householdId).toBe("h2");
    expect(activeMembership(payload, "nope")?.householdId).toBe("h1");
    expect(activeMembership(sessionPayload(null), null)).toBeNull();
  });
});

describe("activeSession", () => {
  it("returns the active household with only its members", () => {
    const s = activeSession(payload, null)!;
    expect(s).toMatchObject({ householdId: "h1", householdName: "Casa", inviteCode: "AAA" });
    expect(s.me).toMatchObject({ id: "m1", role: "admin" });
    expect(s.members.map((m) => m.id)).toEqual(["m1", "x1"]);
    expect(s.memberships).toEqual([
      { householdId: "h1", householdName: "Casa", role: "admin" },
      { householdId: "h2", householdName: "Mare", role: "member" },
    ]);
  });

  it("switches to the preferred household", () => {
    const s = activeSession(payload, "h2")!;
    expect(s.members.map((m) => m.id)).toEqual(["m2"]);
    expect(s.inviteCode).toBe("BBB");
  });

  it("is null without memberships or when the household is missing", () => {
    expect(activeSession(sessionPayload(null), null)).toBeNull();
    expect(activeSession({ ...payload, households: [] }, null)).toBeNull();
  });
});
