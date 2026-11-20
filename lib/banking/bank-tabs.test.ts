import { describe, expect, it } from "vitest";
import { defaultBankTab, reviewsByConnection, SETUP_TAB } from "./bank-tabs";
import type { BankReview } from "./reviews";

describe("defaultBankTab", () => {
  const conns = [{ id: "c1" }, { id: "c2" }];

  it("opens the setup tab without banks or after a failed link", () => {
    expect(defaultBankTab([])).toBe(SETUP_TAB);
    expect(defaultBankTab(conns, "negata")).toBe(SETUP_TAB);
  });

  it("opens the first bank, or the newest right after linking it", () => {
    expect(defaultBankTab(conns)).toBe("c1");
    expect(defaultBankTab(conns, "collegata")).toBe("c2");
  });
});

describe("reviewsByConnection", () => {
  const review = (id: string, accountId: string) => ({ id, accountId }) as BankReview;
  const acc = (accountId: string | null) => ({ accountId }) as BankReview & { accountId: string | null };

  it("groups items by the consent feeding their account, the rest apart", () => {
    const connections = [
      { id: "c1", accounts: [acc("a1"), acc(null)] },
      { id: "c2", accounts: [acc("a2")] },
    ] as unknown as Parameters<typeof reviewsByConnection>[0];
    const { byConnection, other } = reviewsByConnection(connections, [review("r1", "a1"), review("r2", "a2"), review("r3", "a1"), review("r4", "x")]);
    expect(byConnection.c1.map((r) => r.id)).toEqual(["r1", "r3"]);
    expect(byConnection.c2.map((r) => r.id)).toEqual(["r2"]);
    expect(other.map((r) => r.id)).toEqual(["r4"]);
  });
});
