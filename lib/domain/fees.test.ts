import { describe, expect, it } from "vitest";
import { FEE_SOURCE_LABEL, feeCategoryId, feeDescription, feeSource, feeSync } from "./fees";

describe("feeCategoryId", () => {
  it("finds the bank fees category ignoring case and income categories", () => {
    const cats = [
      { id: "i", name: "Commissioni rimborsate", kind: "income" as const },
      { id: "s", name: "Spesa", kind: "expense" as const },
      { id: "c", name: "commissioni bancarie", kind: "expense" as const },
    ];
    expect(feeCategoryId(cats)).toBe("c");
    expect(feeCategoryId([{ id: "s", name: "Spesa", kind: "expense" }])).toBeNull();
  });
});

describe("feeDescription", () => {
  it("labels the fee by payment method", () => {
    expect(feeDescription("bank_transfer", "Affitto")).toBe("Spese bonifico · Affitto");
    expect(feeDescription("cbill", "Bolletta")).toBe("Spese CBill · Bolletta");
    expect(feeDescription("transfer", "Risparmio")).toBe("Spese giroconto · Risparmio");
  });
});

describe("feeSource", () => {
  it("accepts fees on bonifico/CBill payments and transfers only", () => {
    expect(feeSource("expense", "cbill")).toBe("cbill");
    expect(feeSource("transfer", null)).toBe("transfer");
    expect(feeSource("expense", null)).toBeNull();
    expect(feeSource("income", undefined)).toBeNull();
    expect(FEE_SOURCE_LABEL.transfer).toBe("Giroconto");
  });
});

describe("feeSync", () => {
  it("inserts, updates or deletes the linked fee", () => {
    expect(feeSync(false, 65)).toBe("insert");
    expect(feeSync(true, 80)).toBe("update");
    expect(feeSync(true, null)).toBe("delete");
    expect(feeSync(false, null)).toBe("none");
  });
});
