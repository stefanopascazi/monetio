import { describe, expect, it } from "vitest";
import type { TxnView } from "@/lib/data/views";
import { editDefaults } from "./edit-defaults";

const view = (p: Partial<TxnView>): TxnView =>
  ({
    id: "t",
    description: "Quota",
    notes: null,
    amountCents: -80000,
    kind: "transfer",
    status: "booked",
    bookedOn: "2026-11-05",
    accountId: "ste",
    accountName: "Conto Ste",
    counterpartAccountId: "joint",
    counterpartName: "Conto cointestato",
    categoryId: null,
    categoryName: null,
    categoryIcon: null,
    colorIndex: 3,
    source: "rule",
    recurring: true,
    isTransfer: true,
    paymentMethod: null,
    isFee: false,
    feeCents: null,
    createdByName: null,
    skipEstimates: false,
    ...p,
  }) as TxnView;

describe("editDefaults", () => {
  it("keeps payer and receiver of a transfer opened from the paying account", () => {
    expect(editDefaults(view({}))).toMatchObject({ kind: "transfer", accountId: "ste", counterpartAccountId: "joint", amountCents: 80000 });
  });

  it("flips a transfer opened from the receiving account back to payer → receiver", () => {
    const d = editDefaults(view({ amountCents: 80000, accountId: "joint", accountName: "Conto cointestato", counterpartAccountId: "ste", counterpartName: "Conto Ste", feeCents: 100 }));
    expect(d).toMatchObject({ accountId: "ste", accountName: "Conto Ste", counterpartAccountId: "joint", counterpartName: "Conto cointestato", amountCents: 80000, feeCents: 100 });
  });

  it("maps plain movements by sign and payment method", () => {
    expect(editDefaults(view({ isTransfer: false, kind: "income", amountCents: 500, counterpartAccountId: null })).kind).toBe("income");
    expect(editDefaults(view({ isTransfer: false, kind: "expense", paymentMethod: "cbill", counterpartAccountId: null })).kind).toBe("cbill");
  });

  it("carries the flag that leaves a movement out of decreasing estimates", () => {
    expect(editDefaults(view({ kind: "expense", isTransfer: false, counterpartAccountId: null, skipEstimates: true })).skipEstimates).toBe(true);
  });
});
