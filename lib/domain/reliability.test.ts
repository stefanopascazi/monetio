import { describe, expect, it } from "vitest";
import { type AccountFacts, assessReliability, combinedUncertainty, levelOf, uncertaintyCents } from "./reliability";

const TODAY = "2026-11-11";
const good: AccountFacts = {
  accountId: "a",
  name: "Cointestato",
  lastBookedOn: "2026-11-10",
  historyMonths: 12,
  avgMonthlyExpenseCents: 200000,
  declaredMonthlyExpenseCents: 190000,
  overdueCount: 0,
  openEstimates: 0,
  missingRules: 0,
};

describe("assessReliability", () => {
  it("gives full marks to complete, fresh data", () => {
    const r = assessReliability([good], TODAY);
    expect(r).toMatchObject({ score: 100, level: "high", suggestions: [] });
  });

  it("penalises each gap with a suggestion that leads to its fix, biggest gain first", () => {
    const r = assessReliability(
      [{ ...good, lastBookedOn: "2026-10-24", historyMonths: 4, declaredMonthlyExpenseCents: 80000, overdueCount: 2, openEstimates: 1, missingRules: 5 }],
      TODAY,
    );
    expect(r.suggestions.map((s) => [s.kind, s.gain, s.href])).toEqual([
      ["stale", 25, "/dati/importa"],
      ["coverage", 20, "/scadenze"],
      ["rules", 15, "/scadenze"],
      ["history", 10, "/dati/importa"],
      ["overdue", 10, "/scadenze"],
      ["estimates", 5, "/conti/a"],
    ]);
    expect(r.suggestions[0].message).toBe("Aggiorna Cointestato: ultimo movimento 18 giorni fa");
    expect(r.suggestions[1].message).toBe("Spesa media di Cointestato coperta dalle regole: 40%. Aggiungi le spese ricorrenti o una stima");
    expect(r.accounts[0]).toMatchObject({ score: 15, level: "low" });
  });

  it("treats an account without movements as stale and new, never below zero", () => {
    const r = assessReliability([{ ...good, lastBookedOn: null, historyMonths: 0, avgMonthlyExpenseCents: 0, overdueCount: 9, missingRules: 9, openEstimates: 9 }], TODAY);
    expect(r.suggestions[0].message).toBe("Aggiorna Cointestato: nessun movimento registrato");
    expect(r.suggestions.some((s) => s.kind === "coverage")).toBe(false);
    expect(r.accounts[0].score).toBe(0);
  });

  it("averages the accounts for the household", () => {
    const r = assessReliability([good, { ...good, accountId: "b", name: "Carta", lastBookedOn: "2026-09-01" }], TODAY);
    expect(r.accounts.map((a) => a.score)).toEqual([100, 60]);
    expect(r).toMatchObject({ score: 80, level: "high" });
    expect(assessReliability([], TODAY)).toMatchObject({ score: 0, level: "low" });
  });
});

describe("levels and uncertainty", () => {
  it("maps scores to levels", () => {
    expect([levelOf(75), levelOf(74), levelOf(50), levelOf(49)]).toEqual(["high", "medium", "medium", "low"]);
  });

  it("grows the margin with the horizon and with lower reliability", () => {
    expect(uncertaintyCents(100000, "high", 1)).toBe(10000);
    expect(uncertaintyCents(100000, "high", 4)).toBe(20000);
    expect(uncertaintyCents(100000, "low", 4)).toBe(70000);
    expect(uncertaintyCents(0, "low", 4)).toBe(0);
    expect(uncertaintyCents(100000, "low", 0)).toBe(0);
  });

  it("adds up the margins of the accounts in a series", () => {
    const bands = { a: { avgMonthlyExpenseCents: 100000, level: "high" as const }, b: { avgMonthlyExpenseCents: 100000, level: "low" as const } };
    expect(combinedUncertainty(bands, ["a", "b", "missing"], 1)).toBe(45000);
  });
});
