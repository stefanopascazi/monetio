import { describe, expect, it } from "vitest";
import { matchPriorityBanks, summarizeAspsps, toAspspRow } from "./aspsps";
import type { Aspsp } from "./types";

const DAY = 86_400;

describe("toAspspRow", () => {
  it("maps PSU types, consent days and beta", () => {
    expect(toAspspRow({ name: "Fineco", country: "IT", psu_types: ["personal"], maximum_consent_validity: 180 * DAY, beta: true })).toEqual({
      name: "Fineco",
      personal: true,
      business: false,
      consentDays: 180,
      beta: true,
    });
  });

  it("leaves consent days empty when the bank does not say", () => {
    expect(toAspspRow({ name: "X", country: "IT" }).consentDays).toBeNull();
  });
});

describe("summarizeAspsps", () => {
  it("merges a bank listed once per PSU type and sorts by name", () => {
    const list: Aspsp[] = [
      { name: "UniCredit", country: "IT", psu_types: ["business"], maximum_consent_validity: 90 * DAY, beta: false },
      { name: "Banca Sella", country: "IT", psu_types: ["personal"] },
      { name: "UniCredit", country: "IT", psu_types: ["personal"], maximum_consent_validity: 180 * DAY, beta: true },
    ];
    expect(summarizeAspsps(list)).toEqual([
      { name: "Banca Sella", personal: true, business: false, consentDays: null, beta: false },
      { name: "UniCredit", personal: true, business: true, consentDays: 180, beta: false },
    ]);
  });
});

describe("matchPriorityBanks", () => {
  const rows = summarizeAspsps(
    ["Intesa Sanpaolo", "Poste Italiane - BancoPosta", "ING", "Mock ASPSP Banking", "Revolut"].map((name) => ({ name, country: "IT" })),
  );

  it("finds the household's banks and reports missing ones as empty", () => {
    const found = matchPriorityBanks(rows);
    expect(found["Intesa Sanpaolo"].map((r) => r.name)).toEqual(["Intesa Sanpaolo"]);
    expect(found.BancoPosta.map((r) => r.name)).toEqual(["Poste Italiane - BancoPosta"]);
    expect(found.Revolut).toHaveLength(1);
    expect(found.Fineco).toEqual([]);
  });

  it("matches ING as a whole word only", () => {
    expect(matchPriorityBanks(rows).ING.map((r) => r.name)).toEqual(["ING"]);
  });
});
