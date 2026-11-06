import { describe, expect, it } from "vitest";
import { accountMembers } from "./AccountGrid";

const members = [
  { id: "m1", displayName: "Ste", email: null, userId: null, role: "admin" as const },
  { id: "m2", displayName: "Asha", email: null, userId: null, role: "member" as const },
];

describe("accountMembers", () => {
  it("lists everyone for shared and the owner for private", () => {
    expect(accountMembers({ visibility: "shared", ownerMemberId: null }, members)).toEqual(["Ste", "Asha"]);
    expect(accountMembers({ visibility: "private", ownerMemberId: "m2" }, members)).toEqual(["Asha"]);
  });
});
