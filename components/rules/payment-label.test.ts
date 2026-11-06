import { describe, expect, it } from "vitest";
import { paymentLabel } from "./payment-label";

describe("paymentLabel", () => {
  it("names the payment method and its fee", () => {
    expect(paymentLabel({ paymentMethod: "bank_transfer", feeCents: 65 })).toMatch(/^Bonifico \+ 0,65\s€ spese$/);
    expect(paymentLabel({ paymentMethod: "cbill", feeCents: 0 })).toBe("CBill");
    expect(paymentLabel({ paymentMethod: null, feeCents: 0 })).toBeNull();
  });
});
