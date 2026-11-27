import { describe, expect, it } from "vitest";
import { txn } from "../domain/fixtures";
import { FORMER_MEMBER, HIDDEN_ACCOUNT, SOURCE_LABEL, creatorName, executionNote, hiddenAccountName, inferredNote, toTxnView } from "./views";

describe("toTxnView", () => {
  const accounts = [{ id: "a1", name: "Cointestato" }];
  const categories = [{ id: "c", name: "Spesa", kind: "expense" as const, icon: "shopping-cart", colorIndex: 4 as const, archived: true }];

  // Archived categories still label their past transactions.
  it("resolves names and flags", () => {
    const v = toTxnView(txn({ amountCents: -100, bookedOn: "2026-11-01", categoryId: "c", recurringRuleId: "r" }), accounts, categories);
    expect(v).toMatchObject({ accountName: "Cointestato", categoryName: "Spesa", categoryIcon: "shopping-cart", colorIndex: 4, recurring: true, isTransfer: false });
  });

  it("hides private counterparts", () => {
    const v = toTxnView(txn({ amountCents: 100, bookedOn: "2026-11-01", kind: "transfer", counterpartAccountId: "secret" }), accounts, []);
    expect(v).toMatchObject({ counterpartName: HIDDEN_ACCOUNT, categoryIcon: "arrow-left-right", isTransfer: true });
  });
});

describe("toTxnView payments", () => {
  it("flags bonifico/CBill payments and their fee rows", () => {
    const pay = toTxnView(txn({ amountCents: -300000, bookedOn: "2026-11-01", paymentMethod: "bank_transfer" }), [], []);
    expect(pay).toMatchObject({ paymentMethod: "bank_transfer", isFee: false, categoryIcon: "landmark" });
    const fee = toTxnView(txn({ amountCents: -65, bookedOn: "2026-11-01", parentTransactionId: "p" }), [], []);
    expect(fee).toMatchObject({ paymentMethod: null, isFee: true, categoryIcon: "percent" });
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

describe("inferred bank movements", () => {
  it("carries the inferred count and names the bank as origin", () => {
    const v = toTxnView(txn({ amountCents: -160, bookedOn: "2026-11-26", source: "bank", inferredFrom: 9 }), [], []);
    expect(v.inferredFrom).toBe(9);
    expect(SOURCE_LABEL[v.source]).toBe("Dalla banca");
    expect(toTxnView(txn({ amountCents: -1, bookedOn: "2026-11-26" }), [], []).inferredFrom).toBeNull();
  });

  it("explains where description and category come from", () => {
    expect(inferredNote(9)).toContain("9 movimenti simili");
    expect(inferredNote(1)).toContain("1 movimento simile");
  });
});

describe("execution dates of bank movements", () => {
  it("shows the bank booking day only when it differs from the execution day", () => {
    expect(toTxnView(txn({ amountCents: -160, bookedOn: "2026-11-25", bankBookedOn: "2026-11-26" }), [], []).bankBookedOn).toBe("2026-11-26");
    expect(toTxnView(txn({ amountCents: -160, bookedOn: "2026-11-26", bankBookedOn: "2026-11-26" }), [], []).bankBookedOn).toBeNull();
  });

  it("names both days", () => {
    expect(executionNote("2026-11-25", "2026-11-26")).toBe("eseguito il 25 nov 2026, contabilizzato dalla banca il 26 nov 2026.");
  });
});
