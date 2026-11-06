import { describe, expect, it } from "vitest";
import { activeAdmins, householdErrorMessage, isAdmin, isLastAdmin, isMemberRole, memberPermissions, pickActiveHousehold } from "./household";
import type { Member } from "./types";

const member = (id: string, role: Member["role"], userId: string | null = `u-${id}`): Member => ({ id, displayName: id, email: null, userId, role });

describe("household roles", () => {
  it("validates roles", () => {
    expect(isMemberRole("admin")).toBe(true);
    expect(isMemberRole("member")).toBe(true);
    expect(isMemberRole("owner")).toBe(false);
    expect(isMemberRole(null)).toBe(false);
  });

  it("detects admins", () => {
    expect(isAdmin(member("a", "admin"))).toBe(true);
    expect(isAdmin(member("b", "member"))).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });

  it("counts only admins with an account", () => {
    const list = [member("a", "admin"), member("b", "admin", null), member("c", "member")];
    expect(activeAdmins(list).map((m) => m.id)).toEqual(["a"]);
  });

  it("flags the last active admin", () => {
    const list = [member("a", "admin"), member("b", "member")];
    expect(isLastAdmin(list, "a")).toBe(true);
    expect(isLastAdmin(list, "b")).toBe(false);
    expect(isLastAdmin([...list, member("c", "admin")], "a")).toBe(false);
  });
});

describe("pickActiveHousehold", () => {
  const list = [{ householdId: "h1" }, { householdId: "h2" }];
  it("uses the preferred household when valid", () => {
    expect(pickActiveHousehold(list, "h2")).toEqual({ householdId: "h2" });
  });
  it("falls back to the first one", () => {
    expect(pickActiveHousehold(list, "gone")).toEqual({ householdId: "h1" });
    expect(pickActiveHousehold(list, null)).toEqual({ householdId: "h1" });
  });
  it("returns null without households", () => {
    expect(pickActiveHousehold([], "h1")).toBeNull();
  });
});

describe("householdErrorMessage", () => {
  it("translates guard errors", () => {
    expect(householdErrorMessage({ message: "last admin" })).toMatch(/almeno un amministratore/);
    expect(householdErrorMessage({ message: "only admins can change roles" })).toMatch(/Solo un amministratore/);
    expect(householdErrorMessage({ message: "already a member" })).toMatch(/già parte/);
    expect(householdErrorMessage({ code: "23514", message: "violates check constraint" })).toMatch(/conti privati/);
    expect(householdErrorMessage({ message: "boom" })).toBeNull();
    expect(householdErrorMessage(null)).toBeNull();
  });
});

describe("memberPermissions", () => {
  const admin = member("a", "admin");
  const other = member("b", "member");
  const list = [admin, other];
  it("lets admins manage other members", () => {
    expect(memberPermissions(admin, other, list)).toEqual({ canChangeRole: true, canRemove: true });
  });
  it("never manages yourself from the member list", () => {
    expect(memberPermissions(admin, admin, list)).toEqual({ canChangeRole: false, canRemove: false });
  });
  it("gives plain members no controls", () => {
    expect(memberPermissions(other, admin, list)).toEqual({ canChangeRole: false, canRemove: false });
  });
  it("protects the last active admin", () => {
    // A pending admin (no account yet) does not count: "c" is the only active one.
    const lone = member("c", "admin");
    expect(memberPermissions(admin, lone, [lone, member("p", "admin", null), other])).toEqual({ canChangeRole: false, canRemove: false });
    // With two active admins either can be managed.
    expect(memberPermissions(admin, member("d", "admin"), [admin, member("d", "admin")])).toEqual({ canChangeRole: true, canRemove: true });
  });
});
