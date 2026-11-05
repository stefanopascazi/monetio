import { describe, expect, it } from "vitest";
import { parseContributionForm } from "./contribution";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

describe("parseContributionForm", () => {
  it("parses categories from repeated fields", () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries({ fromAccountId: A, toAccountId: B, fixedCents: "80000", sharePercent: "50", dayOfMonth: "28", estimatedSpendingCents: "45000", description: "Quota" })) fd.set(k, v);
    fd.append("categoryIds", C);
    const res = parseContributionForm(fd);
    expect(res.ok && res.value).toMatchObject({ fixedCents: 80000, sharePercent: 50, categoryIds: [C], active: true });
  });

  it("requires categories when sharing a percentage", () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries({ fromAccountId: A, toAccountId: B, sharePercent: "50", dayOfMonth: "28", description: "Quota" })) fd.set(k, v);
    const res = parseContributionForm(fd);
    expect(res).toEqual({ ok: false, errors: { categoryIds: "Scegli almeno una categoria da dividere" } });
  });
});
