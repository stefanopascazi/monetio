import { describe, expect, it } from "vitest";
import { parseTransactionForm } from "./transaction";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

const form = (data: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.set(k, v);
  return fd;
};

describe("parseTransactionForm", () => {
  it("signs expenses negative and keeps booked for past dates", () => {
    const res = parseTransactionForm(form({ kind: "expense", accountId: A, amountCents: "1250", bookedOn: "2026-11-04", description: "Bar" }), "2026-11-05");
    expect(res).toEqual({
      ok: true,
      value: { kind: "expense", accountId: A, counterpartAccountId: null, categoryId: null, amountCents: -1250, bookedOn: "2026-11-04", description: "Bar", notes: null, status: "booked", paymentMethod: null, feeCents: null, skipEstimates: false },
    });
  });

  it("keeps a movement out of decreasing estimates on request, never a transfer", () => {
    const base = { accountId: A, amountCents: "1700", bookedOn: "2026-11-04", description: "Farmacia", skipEstimates: "true" };
    const res = parseTransactionForm(form({ ...base, kind: "expense" }), "2026-11-05");
    expect(res.ok && res.value.skipEstimates).toBe(true);
    const giro = parseTransactionForm(form({ ...base, kind: "transfer", counterpartAccountId: B }), "2026-11-05");
    expect(giro.ok && giro.value.skipEstimates).toBe(false);
  });

  it("marks future dates as planned and keeps income positive", () => {
    const res = parseTransactionForm(form({ kind: "income", accountId: A, amountCents: "100", bookedOn: "2026-12-01", description: "Rimborso" }), "2026-11-05");
    expect(res.ok && res.value).toMatchObject({ amountCents: 100, status: "planned" });
  });

  it("requires a different counterpart for transfers", () => {
    const res = parseTransactionForm(form({ kind: "transfer", accountId: A, counterpartAccountId: A, amountCents: "100", bookedOn: "2026-11-05", description: "Giro" }), "2026-11-05");
    expect(res).toEqual({ ok: false, errors: { counterpartAccountId: "Scegli un conto diverso da quello di partenza" } });
    const ok = parseTransactionForm(form({ kind: "transfer", accountId: A, counterpartAccountId: B, amountCents: "100", bookedOn: "2026-11-05", description: "Giro" }), "2026-11-05");
    expect(ok.ok && ok.value.counterpartAccountId).toBe(B);
  });

  it("books bonifico and CBill as expenses with an optional fee", () => {
    const res = parseTransactionForm(form({ kind: "bank_transfer", accountId: A, amountCents: "300000", feeCents: "65", bookedOn: "2026-11-05", description: "Affitto" }), "2026-11-05");
    expect(res.ok && res.value).toMatchObject({ kind: "expense", paymentMethod: "bank_transfer", amountCents: -300000, feeCents: 65, counterpartAccountId: null });
    const noFee = parseTransactionForm(form({ kind: "cbill", accountId: A, amountCents: "5000", feeCents: "", bookedOn: "2026-11-05", description: "Bolletta" }), "2026-11-05");
    expect(noFee.ok && noFee.value).toMatchObject({ kind: "expense", paymentMethod: "cbill", feeCents: null });
  });

  it("rejects an invalid fee and ignores fees on plain expenses", () => {
    const bad = parseTransactionForm(form({ kind: "cbill", accountId: A, amountCents: "5000", feeCents: "0", bookedOn: "2026-11-05", description: "Bolletta" }), "2026-11-05");
    expect(bad).toEqual({ ok: false, errors: { feeCents: "Le spese devono essere maggiori di zero" } });
    const plain = parseTransactionForm(form({ kind: "expense", accountId: A, amountCents: "5000", feeCents: "65", bookedOn: "2026-11-05", description: "Bar" }), "2026-11-05");
    expect(plain.ok && plain.value).toMatchObject({ paymentMethod: null, feeCents: null });
  });

  it("reports missing fields", () => {
    const res = parseTransactionForm(form({ kind: "expense" }), "2026-11-05");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(Object.keys(res.errors).sort()).toEqual(["accountId", "amountCents", "bookedOn", "description"]);
  });
});
