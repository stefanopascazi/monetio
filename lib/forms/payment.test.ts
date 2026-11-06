import { describe, expect, it } from "vitest";
import { feeFromForm, formKindOf, parsePaymentKind } from "./payment";

const form = (data: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.set(k, v);
  return fd;
};

describe("parsePaymentKind", () => {
  it("maps bonifico/CBill to expenses with an optional fee", () => {
    expect(parsePaymentKind(form({ kind: "bank_transfer", feeCents: "65" }))).toEqual({ kind: "expense", paymentMethod: "bank_transfer", feeCents: 65, kindValid: true, feeValid: true });
    expect(parsePaymentKind(form({ kind: "cbill" }))).toMatchObject({ paymentMethod: "cbill", feeCents: null, feeValid: true });
  });

  it("flags invalid fees and kinds, ignoring fees on plain kinds", () => {
    expect(parsePaymentKind(form({ kind: "cbill", feeCents: "-3" })).feeValid).toBe(false);
    expect(parsePaymentKind(form({ kind: "expense", feeCents: "65" }))).toMatchObject({ paymentMethod: null, feeCents: null, feeValid: true });
    expect(parsePaymentKind(form({ kind: "gift" })).kindValid).toBe(false);
  });
});

describe("feeFromForm", () => {
  it("reads an optional positive fee", () => {
    expect(feeFromForm(form({ feeCents: "150" }))).toBe(150);
    expect(feeFromForm(form({ feeCents: "" }))).toBe(0);
    expect(feeFromForm(form({ feeCents: "0" }))).toBeUndefined();
  });
});

describe("formKindOf", () => {
  it("prefers the payment method", () => {
    expect(formKindOf("expense", "cbill")).toBe("cbill");
    expect(formKindOf("income", null)).toBe("income");
  });
});
