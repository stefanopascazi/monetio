import { describe, expect, it } from "vitest";
import { mapAccount, mapCategory, mapContribution, mapMember, mapRule, mapTransaction } from "./mappers";

describe("mappers", () => {
  it("maps accounts with bigint strings", () => {
    expect(
      mapAccount({ id: "a", name: "Conto", institution: null, type: "checking", visibility: "shared", owner_member_id: null, opening_balance_cents: "390000", opening_date: "2022-01-31", sort_order: 0, archived_at: null }),
    ).toEqual({ id: "a", name: "Conto", institution: null, type: "checking", visibility: "shared", ownerMemberId: null, openingBalanceCents: 390000, openingDate: "2022-01-31", sortOrder: 0, archived: false });
  });

  it("maps transactions", () => {
    const t = mapTransaction({ id: "t", account_id: "a", kind: "expense", status: "booked", amount_cents: -100, booked_on: "2026-11-01", description: "x", source: "manual" });
    expect(t).toMatchObject({ amountCents: -100, counterpartAccountId: null, recurringRuleId: null, occurrenceDate: null });
  });

  it("maps rules, contributions, categories and members", () => {
    expect(mapRule({ id: "r", account_id: "a", kind: "income", description: "S", amount_cents: 1, frequency: "monthly", schedule: "auto", day_of_month: 27, start_date: "2026-11-01", end_date: null, active: true }).dayOfMonth).toBe(27);
    expect(mapContribution({ id: "c", from_account_id: "a", to_account_id: "b", description: "Q", fixed_cents: "80000", share_percent: "50.00", category_ids: ["x"], rounding_cents: 1000, day_of_month: 28, estimated_spending_cents: 45000, start_date: "2026-11-01", active: true })).toMatchObject({ fixedCents: 80000, sharePercent: 50, categoryIds: ["x"] });
    expect(mapCategory({ id: "c", name: "Spesa", kind: "expense", icon: "cart", color_index: 9 }).colorIndex).toBe(6);
    expect(mapMember({ id: "m", display_name: "Ste", email: null, user_id: "u", role: "owner" })).toEqual({ id: "m", displayName: "Ste", email: null, userId: "u", role: "owner" });
  });
});
