import { describe, expect, it } from "vitest";
import type { TransactionResource } from "../enable-banking/types";
import { normalizeTransactions, pickBalance, toCents } from "./normalize";

const txn = (over: Partial<TransactionResource>): TransactionResource => ({
  transaction_amount: { currency: "EUR", amount: "12.30" },
  credit_debit_indicator: "DBIT",
  status: "BOOK",
  booking_date: "2026-11-17",
  ...over,
});

describe("toCents", () => {
  it("parses decimal strings exactly", () => {
    expect(toCents("12.34")).toBe(1234);
    expect(toCents("12.3")).toBe(1230);
    expect(toCents("7")).toBe(700);
    expect(toCents("-0.05")).toBe(-5);
    expect(toCents("1234,5")).toBe(123450);
    expect(toCents("0.105")).toBe(10);
    expect(toCents("abc")).toBeNull();
    expect(toCents("")).toBeNull();
  });
});

describe("normalizeTransactions", () => {
  it("does not repeat a counterparty already in the remittance text", () => {
    const [m] = normalizeTransactions([txn({ entry_reference: "r", creditor: { name: "Aino Mäkinen" }, remittance_information: ["Aino Mäkinen-DBIT-1.00"] })]);
    expect(m.description).toBe("Aino Mäkinen-DBIT-1.00");
  });

  it("signs by direction and builds a readable description", () => {
    const [out, inc] = normalizeTransactions([
      txn({
        entry_reference: "r1",
        creditor: { name: "Esselunga" },
        remittance_information: ["Spesa", " carta 1234 "],
        creditor_account: { iban: "it60 x054 2811 1010 0000 0123 456" },
      }),
      txn({ entry_reference: "r2", credit_debit_indicator: "CRDT", transaction_amount: { currency: "EUR", amount: "1500.00" }, debtor: { name: "ACME Srl" } }),
    ]);
    expect(out).toEqual({
      ref: "r1",
      bookedOn: "2026-11-17",
      amountCents: -1230,
      description: "Esselunga · Spesa carta 1234",
      counterpartyIban: "IT60X0542811101000000123456",
    });
    expect(inc).toMatchObject({ ref: "r2", amountCents: 150000, description: "ACME Srl", counterpartyIban: null });
  });

  it("skips pending rows and rows without a date or amount", () => {
    expect(
      normalizeTransactions([
        txn({ status: "PDNG" }),
        txn({ booking_date: null, value_date: null }),
        txn({ transaction_amount: { currency: "EUR", amount: "x" } }),
      ]),
    ).toEqual([]);
  });

  it("falls back to value date and a content hash, unique for identical rows", () => {
    const rows = normalizeTransactions([txn({ booking_date: null, value_date: "2026-11-16T00:00:00" }), txn({ booking_date: null, value_date: "2026-11-16" })]);
    expect(rows[0].bookedOn).toBe("2026-11-16");
    expect(rows[0].description).toBe("Movimento bancario");
    expect(rows[0].ref).toMatch(/^h[0-9a-f]{8}:0$/);
    expect(rows[1].ref).toBe(rows[0].ref.replace(/:0$/, ":1"));
  });

  it("prefers transaction_id when entry_reference is missing", () => {
    expect(normalizeTransactions([txn({ transaction_id: "tx-9" })])[0].ref).toBe("tx-9");
  });
});

describe("pickBalance", () => {
  it("prefers the booked closing balance", () => {
    expect(
      pickBalance([
        { balance_amount: { currency: "EUR", amount: "90.00" }, balance_type: "ITAV" },
        { balance_amount: { currency: "EUR", amount: "100.50" }, balance_type: "CLBD", reference_date: "2026-11-17" },
      ]),
    ).toEqual({ cents: 10050, currency: "EUR", date: "2026-11-17" });
  });

  it("falls back to any parsable balance and returns null when none", () => {
    expect(pickBalance([{ balance_amount: { currency: "EUR", amount: "5" }, balance_type: "OTHR" }])).toEqual({ cents: 500, currency: "EUR", date: null });
    expect(pickBalance([])).toBeNull();
  });
});
