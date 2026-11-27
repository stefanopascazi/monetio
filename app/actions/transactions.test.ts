import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/data/context", () => ({ getContext: vi.fn(async () => ({ userId: "user-1", householdId: "h1" })) }));
vi.mock("@/lib/data/fee-sync", () => ({ syncFee: vi.fn(async () => null) }));
vi.mock("@/lib/data/fee-category", () => ({ fetchFeeCategoryId: vi.fn() }));
const applyCategoryChoice = vi.fn();
const followsMatch = vi.fn();
vi.mock("@/lib/data/category-matches", () => ({ applyCategoryChoice, followsMatch }));
const parsed = vi.fn();
vi.mock("@/lib/forms/transaction", () => ({ parseTransactionForm: () => parsed() }));

let current: Record<string, unknown> = {};
const update = vi.fn();
const client = {
  from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: current }) }) }),
    update: (patch: unknown) => {
      update(patch);
      return { eq: async () => ({ error: null }) };
    },
  }),
};
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => client) }));

const { updateTransaction } = await import("./transactions");
const id = "11111111-2222-4333-8444-555555555555";
const value = {
  kind: "expense",
  accountId: "acc1",
  amountCents: -1399,
  description: "Netflix",
  categoryId: "abb",
  bookedOn: "2026-11-10",
  notes: null,
  status: "booked",
  paymentMethod: null,
  skipEstimates: false,
  feeCents: null,
};
const save = () => updateTransaction(id, { ok: false }, new FormData());

beforeEach(() => {
  vi.clearAllMocks();
  current = { id, kind: "expense", transfer_group_id: null, account_id: "acc1", parent_transaction_id: null, source: "bank", created_by: null, category_id: null };
  parsed.mockReturnValue({ ok: true, value });
});

describe("updateTransaction inferred movements", () => {
  it("clears the inferred flag once the movement is saved", async () => {
    current.category_id = "abb";
    await save();
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ inferred_from: null, description: "Netflix" }));
  });
});

describe("updateTransaction category propagation", () => {
  it("applies a category set on an uncategorised movement to identical ones", async () => {
    followsMatch.mockResolvedValue(true);
    applyCategoryChoice.mockResolvedValue(4);
    const res = await save();
    expect(followsMatch).toHaveBeenCalledWith(client, "acc1", "Netflix", -1399, null);
    expect(applyCategoryChoice).toHaveBeenCalledWith(client, { householdId: "h1", accountId: "acc1", description: "Netflix", amountCents: -1399, categoryId: "abb" });
    expect(res.message).toMatch(/4 movimenti identici/);
  });

  it("leaves matches alone when the old category was set by hand", async () => {
    current.category_id = "manual";
    followsMatch.mockResolvedValue(false);
    expect((await save()).message).toBe("Modifiche salvate.");
    expect(applyCategoryChoice).not.toHaveBeenCalled();
  });

  it("skips propagation when the category is unchanged or removed", async () => {
    current.category_id = "abb";
    await save();
    parsed.mockReturnValue({ ok: true, value: { ...value, categoryId: null } });
    await save();
    expect(followsMatch).not.toHaveBeenCalled();
  });

  it("keeps the saved edit when propagation fails", async () => {
    followsMatch.mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await save()).toMatchObject({ ok: true, message: "Modifiche salvate." });
    expect(update).toHaveBeenCalled();
  });
});
