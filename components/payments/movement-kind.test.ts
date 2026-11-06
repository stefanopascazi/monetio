import { describe, expect, it } from "vitest";
import { amountKind, isPaymentKind, MOVEMENT_KIND_OPTIONS, takesFee } from "./movement-kind";

describe("movement kinds", () => {
  it("offers bonifico and CBill as expense-toned kinds", () => {
    expect(MOVEMENT_KIND_OPTIONS.map((o) => o.label)).toEqual(["Uscita", "Entrata", "Giroconto", "Bonifico", "CBill"]);
    expect(isPaymentKind("cbill")).toBe(true);
    expect(isPaymentKind("transfer")).toBe(false);
    expect(amountKind("bank_transfer")).toBe("expense");
    expect(amountKind("income")).toBe("income");
  });

  it("accepts a fee on bonifico, CBill and transfer", () => {
    expect(takesFee("bank_transfer")).toBe(true);
    expect(takesFee("cbill")).toBe(true);
    expect(takesFee("transfer")).toBe(true);
    expect(takesFee("expense")).toBe(false);
    expect(takesFee("income")).toBe(false);
  });
});
