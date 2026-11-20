import { describe, expect, it } from "vitest";
import type { Category } from "../domain/types";
import { createMatcher, directionOf, isIdentical, matchKey, propagationTargets, uncategorisedGroups } from "./matches";

const cat = (id: string, kind: Category["kind"], archived = false): Category => ({ id, name: id, kind, icon: null, colorIndex: 1, archived });

describe("matchKey", () => {
  it("ignores case, accents, punctuation and spaces", () => {
    expect(matchKey("  Caffè   BAR-Roma ")).toBe(matchKey("caffe bar roma"));
  });

  it("drops the variable parts of BCC card payments: date, phone and card number", () => {
    const a = "Pagamenti paesi UE DEL 06/11/26 Valuta EUR Paese Italia C/O NETFLIX.COM 18665797172 CARTA N. 497019******0841 - CIRCUITO VISA";
    const b = "Pagamenti paesi UE DEL 06/12/26 Valuta EUR Paese Italia C/O NETFLIX.COM 18665797172 CARTA N. 497019******8620 - CIRCUITO VISA";
    expect(matchKey(a)).toBe(matchKey(b));
    expect(matchKey(a)).toContain("netflix com");
  });

  it("drops mandate codes and instalment numbers of direct debits", () => {
    const a = "ADDEBITO DIRETTO CORE RCUR Prg.Car.: 262990490020568 MNDTCO000001093831P002 COFIDIS SA RATA 056CO COFIDIS SDD00107490653";
    const b = "ADDEBITO DIRETTO CORE RCUR Prg.Car.: 263100670030720 MNDTCO000001093831P002 COFIDIS SA RATA 057CO COFIDIS SDD00107499999";
    expect(matchKey(a)).toBe(matchKey(b));
  });

  it("keeps different merchants apart and merges Revolut top-ups of different cards", () => {
    expect(matchKey("Google Play")).not.toBe(matchKey("Google"));
    expect(matchKey("Ricarica di *2573")).toBe(matchKey("Ricarica di *3210"));
  });

  it("is empty when only codes are left", () => {
    expect(matchKey("123 456/78")).toBe("");
  });
});

describe("isIdentical", () => {
  it("needs the same key and the same direction of money", () => {
    expect(isIdentical({ description: "Netflix 01/11", amountCents: -1399 }, { description: "NETFLIX", amountCents: -999 })).toBe(true);
    expect(isIdentical({ description: "Netflix", amountCents: -1399 }, { description: "Netflix", amountCents: 1399 })).toBe(false);
    expect(isIdentical({ description: "123", amountCents: -1 }, { description: "456", amountCents: -1 })).toBe(false);
  });

  it("treats zero as an expense", () => {
    expect(directionOf(0)).toBe(-1);
  });
});

describe("createMatcher", () => {
  const match = createMatcher(
    [
      { key: "netflix", direction: -1, categoryId: "abb" },
      { key: "vecchio", direction: -1, categoryId: "old" },
    ],
    [cat("abb", "expense"), cat("old", "expense", true)],
  );

  it("finds the category of identical descriptions in the same direction", () => {
    expect(match("NETFLIX 06/11", -1399)).toBe("abb");
    expect(match("Netflix", 1399)).toBeNull();
    expect(match("Netflix premium", -1399)).toBeNull();
  });

  it("skips archived categories and empty keys", () => {
    expect(match("Vecchio", -1)).toBeNull();
    expect(match("0000", -1)).toBeNull();
  });
});

describe("propagationTargets", () => {
  const movements = [
    { id: "1", description: "Netflix", amountCents: -1399, categoryId: null },
    { id: "2", description: "NETFLIX 06/11", amountCents: -1399, categoryId: "old" },
    { id: "3", description: "Netflix", amountCents: -1399, categoryId: "manual" },
    { id: "4", description: "Netflix", amountCents: 1399, categoryId: null },
    { id: "5", description: "Spotify", amountCents: -999, categoryId: null },
  ];
  const chosen = { description: "Netflix", amountCents: -1399 };

  it("touches only identical uncategorised movements of the same direction", () => {
    expect(propagationTargets(movements, chosen, null).map((m) => m.id)).toEqual(["1"]);
  });

  it("also moves those still on the old matched category, never manual ones", () => {
    expect(propagationTargets(movements, chosen, "old").map((m) => m.id)).toEqual(["1", "2"]);
  });
});

describe("uncategorisedGroups", () => {
  it("groups identical descriptions per direction with count, total and the latest wording", () => {
    const groups = uncategorisedGroups([
      { description: "Google Play 01/10", amountCents: -499, bookedOn: "2026-10-01" },
      { description: "Google Play 01/11", amountCents: -499, bookedOn: "2026-11-01" },
      { description: "Linkem Spa", amountCents: -2990, bookedOn: "2026-11-02" },
      { description: "Google Play", amountCents: 499, bookedOn: "2026-11-03" },
      { description: "0001", amountCents: -1, bookedOn: "2026-11-03" },
    ]);
    expect(groups).toEqual([
      { key: "google play", direction: -1, description: "Google Play 01/11", count: 2, totalCents: -998 },
      { key: "linkem spa", direction: -1, description: "Linkem Spa", count: 1, totalCents: -2990 },
      { key: "google play", direction: 1, description: "Google Play", count: 1, totalCents: 499 },
    ]);
  });
});
