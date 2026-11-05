import { describe, expect, it } from "vitest";
import { parseOverrideForm, parseRuleKey } from "./override";

const form = (data: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.set(k, v);
  return fd;
};

describe("parseOverrideForm", () => {
  it("parses amount, due date and note", () => {
    expect(parseOverrideForm(form({ amountCents: "8740", dueDate: "2026-12-02", note: " n. 123 " }))).toEqual({
      ok: true,
      value: { amountCents: 8740, dueDate: "2026-12-02", note: "n. 123" },
    });
  });

  it("rejects missing values", () => {
    const res = parseOverrideForm(form({}));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(Object.keys(res.errors).sort()).toEqual(["amountCents", "dueDate"]);
  });
});

describe("parseRuleKey", () => {
  it("reads rule and period", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(parseRuleKey(`r:${id}|2026-11`)).toEqual({ ruleId: id, period: "2026-11" });
    expect(parseRuleKey(`r:${id}|2026-11-03`)).toEqual({ ruleId: id, period: "2026-11-03" });
    expect(parseRuleKey(`c:${id}|2026-11`)).toBeNull();
  });
});
