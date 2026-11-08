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

  it("parses bonifico/CBill rules as expenses with a fee", () => {
    const res = parseRuleForm(form({ ...valid, kind: "cbill", schedule: "due", feeCents: "150" }));
    expect(res.ok && res.value).toMatchObject({ kind: "expense", paymentMethod: "cbill", feeCents: 150, amountCents: -78110 });
    const plain = parseRuleForm(form(valid));
    expect(plain.ok && plain.value).toMatchObject({ paymentMethod: null, feeCents: 0 });
  });

  it("keeps the fee of transfer rules except estimates", () => {
    const B = "22222222-2222-4222-8222-222222222222";
    const res = parseRuleForm(form({ ...valid, kind: "transfer", counterpartAccountId: B, feeCents: "100" }));
    expect(res.ok && res.value).toMatchObject({ kind: "transfer", paymentMethod: null, feeCents: 100, counterpartAccountId: B });
    const estimate = parseRuleForm(form({ ...valid, kind: "transfer", counterpartAccountId: B, schedule: "estimate", feeCents: "100" }));
    expect(estimate.ok && estimate.value).toMatchObject({ feeCents: 0 });
  });

  it("rejects estimate payments and invalid fees", () => {
    const res = parseRuleForm(form({ ...valid, kind: "bank_transfer", schedule: "estimate", feeCents: "0" }));
    expect(res).toEqual({ ok: false, errors: { schedule: "Un bonifico o CBill non può essere una stima", feeCents: "Le spese devono essere maggiori di zero" } });
  });

  it("reads the active flag", () => {
    const res = parseRuleForm(form({ ...valid, active: "false" }));
    expect(res.ok && res.value.active).toBe(false);
  });
});

describe("parseRuleForm non-monthly anchor", () => {
  it("derives the day from the first due date", () => {
    const res = parseRuleForm(form({ ...valid, frequency: "yearly", dayOfMonth: "1", startDate: "2027-03-15" }));
    expect(res.ok && res.value).toMatchObject({ dayOfMonth: 15, startDate: "2027-03-15" });
  });

  it("keeps the posted day for monthly rules", () => {
    const res = parseRuleForm(form({ ...valid, dayOfMonth: "27", startDate: "2026-11-01" }));
    expect(res.ok && res.value).toMatchObject({ dayOfMonth: 27 });
  });
});

describe("parseRuleForm decreasing estimates", () => {
  const C = "22222222-2222-4222-8222-222222222222";
  const estimate = { ...valid, schedule: "estimate", decreasing: "true" };
  const withCats = (data: Record<string, string>, cats: string[]) => {
    const fd = form(data);
    for (const c of cats) fd.append("decrementCategoryIds", c);
    return fd;
  };

  it("keeps estimates fixed by default", () => {
    const res = parseRuleForm(withCats({ ...valid, schedule: "estimate" }, [C]));
    expect(res.ok && res.value.decrementCategoryIds).toEqual([]);
  });

  it("saves the chosen categories of a decreasing estimate", () => {
    const res = parseRuleForm(withCats(estimate, [C, C]));
    expect(res.ok && res.value.decrementCategoryIds).toEqual([C]);
  });

  it("requires at least one valid category", () => {
    expect(parseRuleForm(withCats(estimate, []))).toMatchObject({ ok: false, errors: { decrementCategoryIds: "Scegli almeno una categoria da scalare" } });
    expect(parseRuleForm(withCats(estimate, ["x"]))).toMatchObject({ ok: false, errors: { decrementCategoryIds: "Categoria non valida" } });
  });

  it("ignores the categories outside income/expense estimates", () => {
    const due = parseRuleForm(withCats({ ...estimate, schedule: "due" }, [C]));
    expect(due.ok && due.value.decrementCategoryIds).toEqual([]);
    const transfer = parseRuleForm(withCats({ ...estimate, kind: "transfer", counterpartAccountId: C }, [C]));
    expect(transfer.ok && transfer.value.decrementCategoryIds).toEqual([]);
  });
});
