import { describe, expect, it } from "vitest";
import { ACCOUNTS, CATEGORIES } from "./mapping";
import { SEED_CONTRIBUTIONS, SEED_RULES } from "./seed-rules";

const accountKeys = new Set(ACCOUNTS.map((a) => a.key));
const categories = new Set(CATEGORIES.map((c) => c.name));

describe("seed rules", () => {
  it("reference known accounts and categories with a coherent sign", () => {
    for (const r of SEED_RULES) {
      expect(accountKeys.has(r.account), r.description).toBe(true);
      expect(categories.has(r.category), r.description).toBe(true);
      if (r.kind === "income") expect(r.amountCents).toBeGreaterThan(0);
      if (r.kind === "expense") expect(r.amountCents).toBeLessThan(0);
      if (r.kind === "transfer") expect(r.counterpart && accountKeys.has(r.counterpart)).toBe(true);
      if (r.endDate) expect(r.endDate > r.startDate).toBe(true);
    }
  });

  it("contributions point at known accounts and categories", () => {
    for (const c of SEED_CONTRIBUTIONS) {
      expect(accountKeys.has(c.from) && accountKeys.has(c.to)).toBe(true);
      expect(c.categories.every((n) => categories.has(n))).toBe(true);
    }
  });
});
