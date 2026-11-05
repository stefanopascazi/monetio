import { describe, expect, it } from "vitest";
import { txn } from "../domain/fixtures";
import { HIDDEN_ACCOUNT, toTxnView } from "./views";

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
