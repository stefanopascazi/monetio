import { describe, expect, it } from "vitest";
import { txn } from "../domain/fixtures";
import { FORMER_MEMBER, HIDDEN_ACCOUNT, creatorName, hiddenAccountName, toTxnView } from "./views";

describe("toTxnView", () => {
  const accounts = [{ id: "a1", name: "Cointestato" }];
  const categories = [{ id: "c", name: "Spesa", kind: "expense" as const, icon: "shopping-cart", colorIndex: 4 as const }];

  it("resolves names and flags", () => {
    const v = toTxnView(txn({ amountCents: -100, bookedOn: "2026-11-01", categoryId: "c", recurringRuleId: "r" }), accounts, categories);
    expect(v).toMatchObject({ accountName: "Cointestato", categoryName: "Spesa", categoryIcon: "shopping-cart", colorIndex: 4, recurring: true, isTransfer: false });
  });

  it("hides private counterparts", () => {
    const v = toTxnView(txn({ amountCents: 100, bookedOn: "2026-11-01", kind: "transfer", counterpartAccountId: "secret" }), accounts, []);
    expect(v).toMatchObject({ counterpartName: HIDDEN_ACCOUNT, categoryIcon: "arrow-left-right", isTransfer: true });
  });
});

describe("creatorName", () => {
  const members = [{ userId: "u1", displayName: "Ste" }, { userId: null, displayName: "Invitata" }];

  it("resolves the member who created the transaction", () => {
    expect(creatorName("u1", members)).toBe("Ste");
    expect(toTxnView(txn({ amountCents: -1, bookedOn: "2026-11-01", createdBy: "u1" }), [], [], members).createdByName).toBe("Ste");
  });

  it("is null without a creator (imports, automatic bookings)", () => {
    expect(creatorName(null, members)).toBeNull();
    expect(toTxnView(txn({ amountCents: -1, bookedOn: "2026-11-01" }), [], []).createdByName).toBeNull();
  });

  it("labels users no longer in the household", () => {
    expect(creatorName("gone", members)).toBe(FORMER_MEMBER);
  });
});

describe("hiddenAccountName", () => {
  it("names the owner when known", () => {
    expect(hiddenAccountName("Asha")).toBe("Conto privato di Asha");
    expect(hiddenAccountName(" ")).toBe(HIDDEN_ACCOUNT);
    expect(hiddenAccountName(null)).toBe(HIDDEN_ACCOUNT);
  });
});
