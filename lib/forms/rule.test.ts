import { describe, expect, it } from "vitest";
import { parseRuleForm } from "./rule";

const A = "11111111-1111-4111-8111-111111111111";
const form = (data: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.set(k, v);
  return fd;
};
const valid = { kind: "expense", accountId: A, amountCents: "78110", frequency: "monthly", schedule: "auto", dayOfMonth: "1", startDate: "2026-11-01", description: "Mutuo" };

describe("parseRuleForm", () => {
  it("parses a valid rule with signed amount", () => {
    const res = parseRuleForm(form({ ...valid, endDate: "2046-10-31" }));
    expect(res.ok && res.value).toMatchObject({ amountCents: -78110, endDate: "2046-10-31", active: true, counterpartAccountId: null });
  });

  it("rejects end before start and bad day", () => {
    const res = parseRuleForm(form({ ...valid, endDate: "2026-01-01", dayOfMonth: "40" }));
    expect(res).toEqual({ ok: false, errors: { dayOfMonth: "Giorno tra 1 e 31", endDate: "La fine deve essere dopo l'inizio" } });
  });

  it("reads the active flag", () => {
    const res = parseRuleForm(form({ ...valid, active: "false" }));
    expect(res.ok && res.value.active).toBe(false);
  });
});
