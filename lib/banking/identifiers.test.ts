import { describe, expect, it } from "vitest";
import { extractCardLast4, extractIbans, isValidBic, isValidIban, maskIban, normalizeIban, parseCardLast4 } from "./identifiers";

// Public example IBANs (valid check digits, not real accounts).
const IT = "IT60X0542811101000000123456";
const DE = "DE89370400440532013000";

describe("IBAN", () => {
  it("normalises spaces, dots and case", () => {
    expect(normalizeIban(" it60 x054 2811.1010 0000 0123 456 ")).toBe(IT);
  });

  it("validates check digits and country length", () => {
    expect(isValidIban(IT)).toBe(true);
    expect(isValidIban(DE)).toBe(true);
    expect(isValidIban("IT61X0542811101000000123456")).toBe(false);
    expect(isValidIban("IT60X054281110100000012345")).toBe(false);
    expect(isValidIban("XX60X0542811101000000123456")).toBe(false);
  });

  it("masks all but country, check digits and last 4", () => {
    expect(maskIban(IT)).toBe("IT60 •••• 3456");
  });
});

describe("extractIbans", () => {
  it("finds grouped IBANs followed by other words", () => {
    expect(extractIbans("Bonifico a: Mario Coor.Benef.: IT60 X054 2811 1010 0000 0123 456 Banca Destinataria")).toEqual([IT]);
  });

  it("finds compact IBANs and skips invalid or repeated ones", () => {
    expect(extractIbans(`SDD ${IT} 123 ROSSI IT99ZZZ0000000000000 ${IT} ${DE}`)).toEqual([IT, DE]);
  });

  it("returns nothing when there is no IBAN", () => {
    expect(extractIbans("Pagamento POS CONAD CARTA N. 123456******1234")).toEqual([]);
  });
});

describe("cards", () => {
  it("extracts last 4 digits after a mask", () => {
    expect(extractCardLast4("Ricarica di *1234")).toEqual(["1234"]);
    expect(extractCardLast4("CARTA N. 123456******5678 e ancora ****5678")).toEqual(["5678"]);
    expect(extractCardLast4("Ricarica 1234")).toEqual([]);
  });

  it("parses a list of last 4 digits", () => {
    expect(parseCardLast4("1234, 5678 1234")).toEqual(["1234", "5678"]);
    expect(parseCardLast4("")).toEqual([]);
    expect(parseCardLast4("123")).toBeNull();
  });
});

describe("BIC", () => {
  it("accepts 8 or 11 characters", () => {
    expect(isValidBic("BPMOIT22")).toBe(true);
    expect(isValidBic("BPMOIT22XXX")).toBe(true);
    expect(isValidBic("BPMO22")).toBe(false);
  });
});
