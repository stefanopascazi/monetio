import { describe, expect, it } from "vitest";
import { attachFees, mapAccount, mapCategory, mapContribution, mapMember, mapRule, mapTotals, mapTransaction } from "./mappers";

describe("mappers", () => {
  it("maps accounts with bigint strings", () => {
    expect(
      mapAccount({ id: "a", name: "Conto", institution: null, type: "checking", visibility: "shared", owner_member_id: null, opening_balance_cents: "390000", opening_date: "2022-01-31", sort_order: 0, archived_at: null }),
    ).toEqual({ id: "a", name: "Conto", institution: null, type: "checking", visibility: "shared", ownerMemberId: null, openingBalanceCents: 390000, openingDate: "2022-01-31", sortOrder: 0, archived: false, ibanMasked: null, bic: null, cardLast4: [] });
  });

  it("masks the account IBAN and maps cards", () => {
    const a = mapAccount({ id: "a", name: "C", type: "checking", visibility: "shared", opening_date: "2022-01-31", iban: "IT60X0542811101000000123456", bic: "BPMOIT22", card_last4: ["1234"] });
    expect(a).toMatchObject({ ibanMasked: "IT60 •••• 3456", bic: "BPMOIT22", cardLast4: ["1234"] });
    expect(JSON.stringify(a)).not.toContain("0542811101");
  });

  it("maps transactions", () => {
    const t = mapTransaction({ id: "t", account_id: "a", kind: "expense", status: "booked", amount_cents: -100, booked_on: "2026-11-01", description: "x", source: "manual" });
    expect(t).toMatchObject({ amountCents: -100, counterpartAccountId: null, recurringRuleId: null, occurrenceDate: null, createdBy: null });
    expect(mapTransaction({ id: "t", account_id: "a", amount_cents: 1, booked_on: "2026-11-01", description: "x", created_by: "u1" }).createdBy).toBe("u1");
    expect(mapTransaction({ id: "t", account_id: "a", amount_cents: -65, booked_on: "2026-11-01", description: "x", payment_method: "cbill", parent_transaction_id: "p" })).toMatchObject({ paymentMethod: "cbill", parentTransactionId: "p" });
    expect(t).toMatchObject({ paymentMethod: null, parentTransactionId: null, feeCents: null });
  });

  it("shares a transfer fee with the receiving side", () => {
    const out = mapTransaction({ id: "s", account_id: "a", kind: "transfer", amount_cents: -100, booked_on: "2026-11-01", description: "x", transfer_group_id: "g" });
    const inc = mapTransaction({ id: "d", account_id: "b", kind: "transfer", amount_cents: 100, booked_on: "2026-11-01", description: "x", transfer_group_id: "g" });
    const lone = mapTransaction({ id: "l", account_id: "b", kind: "transfer", amount_cents: 50, booked_on: "2026-11-01", description: "y", transfer_group_id: "h" });
    const res = attachFees([out, inc, lone], [{ parentId: "s", amountCents: -100 }], [{ id: "s", groupId: "g" }, { id: "d", groupId: "g" }]);
    expect(res.map((t) => t.feeCents)).toEqual([100, 100, null]);
  });

  it("attaches fee totals to their payments", () => {
    const pay = mapTransaction({ id: "p", account_id: "a", amount_cents: -1, booked_on: "2026-11-01", description: "x", payment_method: "cbill" });
    const other = mapTransaction({ id: "o", account_id: "a", amount_cents: -1, booked_on: "2026-11-01", description: "y" });
    const [p, o] = attachFees([pay, other], [{ parentId: "p", amountCents: -65 }, { parentId: "p", amountCents: -10 }]);
    expect(p.feeCents).toBe(75);
    expect(o.feeCents).toBeNull();
  });

  it("maps rules, contributions, categories and members", () => {
    expect(mapRule({ id: "r", account_id: "a", kind: "income", description: "S", amount_cents: 1, frequency: "monthly", schedule: "auto", day_of_month: 27, start_date: "2026-11-01", end_date: null, active: true }).dayOfMonth).toBe(27);
    expect(mapRule({ id: "r", account_id: "a", kind: "expense", description: "A", amount_cents: -1, payment_method: "bank_transfer", fee_cents: "65", active: true })).toMatchObject({ paymentMethod: "bank_transfer", feeCents: 65 });
    expect(mapRule({ id: "r", account_id: "a", kind: "expense", description: "A", amount_cents: -1, fee_cents: 65, active: true })).toMatchObject({ paymentMethod: null, feeCents: 0 });
    expect(mapRule({ id: "r", account_id: "a", counterpart_account_id: "b", kind: "transfer", description: "G", amount_cents: -1, fee_cents: 100, active: true })).toMatchObject({ paymentMethod: null, feeCents: 100 });
    expect(mapContribution({ id: "c", from_account_id: "a", to_account_id: "b", description: "Q", fixed_cents: "80000", share_percent: "50.00", category_ids: ["x"], rounding_cents: 1000, day_of_month: 28, estimated_spending_cents: 45000, start_date: "2026-11-01", active: true })).toMatchObject({ fixedCents: 80000, sharePercent: 50, categoryIds: ["x"] });
    expect(mapCategory({ id: "c", name: "Spesa", kind: "expense", icon: "cart", color_index: 9 }).colorIndex).toBe(6);
    expect(mapCategory({ id: "c", name: "Spesa", kind: "expense", color_index: 1, archived_at: null }).archived).toBe(false);
    expect(mapCategory({ id: "c", name: "Spesa", kind: "expense", color_index: 1, archived_at: "2026-11-09T10:00:00Z" }).archived).toBe(true);
    expect(mapMember({ id: "m", display_name: "Ste", email: null, user_id: "u", role: "admin" })).toEqual({ id: "m", displayName: "Ste", email: null, userId: "u", role: "admin" });
    expect(mapMember({ id: "m", display_name: "Ste", email: null, user_id: "u", role: "owner" }).role).toBe("admin");
  });
});

describe("mapTotals", () => {
  it("parses bigint strings and defaults to zero", () => {
    expect(mapTotals({ count: "12", income_cents: "150000", expense_cents: 9000 })).toEqual({ count: 12, incomeCents: 150000, expenseCents: 9000 });
    expect(mapTotals(null)).toEqual({ count: 0, incomeCents: 0, expenseCents: 0 });
  });
});
