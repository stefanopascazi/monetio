import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AccountWithBalance } from "@/lib/data/queries";
import { AccountGrid, accountMembers } from "./AccountGrid";

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

describe("AccountGrid", () => {
  it("marks every card as maskable in privacy mode", () => {
    const account = { id: "a1", name: "Contanti", institution: null, type: "cash", visibility: "shared", ownerMemberId: null, balanceCents: 100, archived: false } as AccountWithBalance;
    render(<AccountGrid accounts={[account]} members={members} />);
    expect(screen.getByRole("link").querySelector(".mio-balances")).not.toBeNull();
  });
});
