import { describe, expect, it } from "vitest";
import { parseAccountForm } from "./account";

const form = (data: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.set(k, v);
  return fd;
};

describe("parseAccountForm", () => {
  it("parses a shared account with negative opening balance", () => {
    const res = parseAccountForm(form({ name: "Carta", type: "checking", visibility: "shared", openingBalanceCents: "1500", openingNegative: "true", openingDate: "2026-11-01" }));
    expect(res).toEqual({ ok: true, value: { name: "Carta", institution: null, type: "checking", visibility: "shared", openingBalanceCents: -1500, openingDate: "2026-11-01", iban: undefined, bic: null, cardLast4: [] } });
  });

  it("rejects missing name and type", () => {
    const res = parseAccountForm(form({ visibility: "private", openingDate: "2026-11-01" }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(Object.keys(res.errors).sort()).toEqual(["name", "type"]);
  });

  const base = { name: "Conto", type: "checking", visibility: "shared", openingDate: "2026-11-01" };

  it("normalises bank identifiers", () => {
    const res = parseAccountForm(form({ ...base, iban: "it60 x054 2811 1010 0000 0123 456", bic: "bpmoit22", cardLast4: "1234, 5678" }));
    expect(res).toMatchObject({ ok: true, value: { iban: "IT60X0542811101000000123456", bic: "BPMOIT22", cardLast4: ["1234", "5678"] } });
  });

  it("keeps the saved IBAN when empty and clears it on request", () => {
    expect(parseAccountForm(form(base))).toMatchObject({ value: { iban: undefined } });
    expect(parseAccountForm(form({ ...base, iban: "IT60X0542811101000000123456", ibanRemove: "true" }))).toMatchObject({ value: { iban: null } });
  });

  it("rejects invalid identifiers", () => {
    const res = parseAccountForm(form({ ...base, iban: "IT61X0542811101000000123456", bic: "XX", cardLast4: "12a4" }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(Object.keys(res.errors).sort()).toEqual(["bic", "cardLast4", "iban"]);
  });
});
