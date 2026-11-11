import { describe, expect, it } from "vitest";
import { findNoise, merchantKey, merchantLabel, merchantTokens, overlap, withCompounds } from "./merchant";

// Synthetic descriptions shaped like Italian bank exports (no real data).
const UTILITY = "ADDEBITO DIRETTO CORE RCUR Prg.Car.: 100000000000001 900000000000001 ROSSI MARIO IT00X0000000000000000000000 ACQUAGAS S.P.A. - BANCAXYZ ABCDITMMXXX";
const STREAMING = "Pagamenti paesi UE DEL 06/11/26 Valuta EUR Paese Italia C/O FILMFLIX.COM 10000000000 CARTA N. 000000******0000 - CIRCUITO VISA";

describe("merchantTokens", () => {
  it("drops codes, dates, BIC codes and banking boilerplate", () => {
    expect(merchantTokens(STREAMING)).toEqual(["filmflix"]);
    expect(merchantTokens(UTILITY)).toEqual(["rossi", "mario", "acquagas", "bancaxyz"]);
  });

  it("drops extra noise words", () => {
    expect(merchantTokens(UTILITY, new Set(["rossi", "mario"]))).toEqual(["acquagas", "bancaxyz"]);
  });
});

describe("findNoise", () => {
  it("flags words that sit next to many different merchants", () => {
    const noise = findNoise([UTILITY, "ADDEBITO ROSSI MARIO LUCEPIU", "BONIFICO ROSSI MARIO TELEFONIA UNO", STREAMING, "FILMFLIX.COM"]);
    expect([...noise].sort()).toEqual(["mario", "rossi"]);
  });
});

describe("merchantKey / merchantLabel / overlap", () => {
  it("keys on the first three merchant words and labels them", () => {
    expect(merchantKey(STREAMING)).toBe("filmflix");
    expect(merchantKey("12/03 ***")).toBe("");
    expect(merchantLabel("PAGAMENTO POS NEGOZIO MODA CENTRO DE")).toBe("Negozio Moda Centro");
    expect(merchantLabel("12/03")).toBe("12/03");
  });

  it("adds joined neighbours so split brand names match", () => {
    expect(withCompounds(["telefonia", "uno", "spa"])).toEqual(["telefonia", "uno", "spa", "telefoniauno", "unospa"]);
    expect(overlap(withCompounds(["telefonia", "uno"]), ["telefoniauno"])).toBe(1);
  });

  it("measures shared words over the shorter list", () => {
    expect(overlap(["filmflix"], ["filmflix", "abbonamento"])).toBe(1);
    expect(overlap(["telefonia", "uno"], ["telefonia", "due"])).toBe(0.5);
    expect(overlap([], ["x"])).toBe(0);
  });
});
