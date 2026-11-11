import { describe, expect, it } from "vitest";
import { parseRuleForm } from "@/lib/forms/rule";
import { ruleFormData } from "./recurring-form";

describe("ruleFormData", () => {
  it("builds a due rule the rule parser accepts", () => {
    const fd = ruleFormData("11111111-1111-4111-8111-111111111111", {
      description: "Netflix",
      amountCents: -1399,
      frequency: "monthly",
      dayOfMonth: 6,
      startDate: "2026-12-06",
      categoryId: "22222222-2222-4222-8222-222222222222",
    });
    const parsed = parseRuleForm(fd);
    expect(parsed).toMatchObject({
      ok: true,
      value: { kind: "expense", amountCents: -1399, frequency: "monthly", schedule: "due", dayOfMonth: 6, startDate: "2026-12-06", description: "Netflix", categoryId: "22222222-2222-4222-8222-222222222222" },
    });
  });

  it("maps income and a missing category", () => {
    const parsed = parseRuleForm(ruleFormData("11111111-1111-4111-8111-111111111111", { description: "Stipendio", amountCents: 210000, frequency: "monthly", dayOfMonth: 27, startDate: "2026-12-27", categoryId: null }));
    expect(parsed).toMatchObject({ ok: true, value: { kind: "income", amountCents: 210000, categoryId: null } });
  });
});
