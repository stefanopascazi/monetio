import { describe, expect, it } from "vitest";
import { feeCategoryId, feeDescription, feeSync } from "./fees";

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
