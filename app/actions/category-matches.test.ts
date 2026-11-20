import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/data/context", () => ({ getContext: vi.fn(async () => ({ userId: "user-1", householdId: "h1" })) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
const CAT = "99999999-8888-4777-8666-555555555555";
const INCOME = "99999999-8888-4777-8666-444444444444";
vi.mock("@/lib/data/queries", () => ({
  listCategories: vi.fn(async () => [
    { id: CAT, name: "Bar", kind: "expense", icon: null, colorIndex: 1, archived: false },
    { id: INCOME, name: "Stipendio", kind: "income", icon: null, colorIndex: 2, archived: false },
  ]),
}));
const applyCategoryChoice = vi.fn();
const removeAccountMatch = vi.fn();
vi.mock("@/lib/data/category-matches", () => ({ applyCategoryChoice, removeAccountMatch }));

const { assignGroupCategory, removeCategoryMatch } = await import("./category-matches");
const acc = "11111111-2222-4333-8444-555555555555";

beforeEach(() => vi.clearAllMocks());

describe("assignGroupCategory", () => {
  it("applies the category to the group and reports how many movements changed", async () => {
    applyCategoryChoice.mockResolvedValue(3);
    const res = await assignGroupCategory(acc, "Bar Roma", -1, CAT);
    expect(res).toMatchObject({ ok: true, message: expect.stringContaining("3 movimenti") });
    expect(applyCategoryChoice).toHaveBeenCalledWith({}, { householdId: "h1", accountId: acc, description: "Bar Roma", amountCents: -1, categoryId: CAT });
  });

  it("rejects bad input and categories of the other direction", async () => {
    expect((await assignGroupCategory("x", "Bar", -1, CAT)).ok).toBe(false);
    expect((await assignGroupCategory(acc, " ", -1, CAT)).ok).toBe(false);
    expect((await assignGroupCategory(acc, "Bar", 0, CAT)).ok).toBe(false);
    expect((await assignGroupCategory(acc, "Bar", -1, INCOME)).message).toMatch(/non adatta/);
    expect(applyCategoryChoice).not.toHaveBeenCalled();
  });

  it("explains descriptions that cannot be matched and database failures", async () => {
    applyCategoryChoice.mockResolvedValueOnce(null);
    expect((await assignGroupCategory(acc, "0001", -1, CAT)).ok).toBe(false);
    applyCategoryChoice.mockRejectedValueOnce(new Error("boom"));
    expect((await assignGroupCategory(acc, "Bar", -1, CAT)).message).toMatch(/Riprova/);
  });
});

describe("removeCategoryMatch", () => {
  it("removes a match by id", async () => {
    expect((await removeCategoryMatch(acc)).ok).toBe(true);
    expect(removeAccountMatch).toHaveBeenCalledWith({}, acc);
    expect((await removeCategoryMatch("x")).ok).toBe(false);
  });
});
