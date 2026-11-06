import { describe, expect, it } from "vitest";
import { amountKind, isPaymentKind, MOVEMENT_KIND_OPTIONS } from "./movement-kind";

describe("movement kinds", () => {
  it("offers bonifico and CBill as expense-toned kinds", () => {
    expect(MOVEMENT_KIND_OPTIONS.map((o) => o.label)).toEqual(["Uscita", "Entrata", "Giroconto", "Bonifico", "CBill"]);
    expect(isPaymentKind("cbill")).toBe(true);
    expect(isPaymentKind("transfer")).toBe(false);
    expect(amountKind("bank_transfer")).toBe("expense");
    expect(amountKind("income")).toBe("income");
  });
});
