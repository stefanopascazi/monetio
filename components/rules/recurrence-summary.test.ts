import { describe, expect, it } from "vitest";
import { recurrenceSummary } from "./recurrence-summary";

describe("recurrenceSummary", () => {
  it("describes yearly with month", () => {
    expect(recurrenceSummary("yearly", "2027-03-15")).toBe("Ogni anno il 15 marzo");
  });

  it("lists the months of multi-month frequencies in calendar order", () => {
    expect(recurrenceSummary("quarterly", "2026-11-10")).toBe("Ogni 3 mesi il giorno 10 (febbraio, maggio, agosto, novembre)");
    expect(recurrenceSummary("semiannual", "2026-07-01")).toBe("Ogni 6 mesi il giorno 1 (gennaio, luglio)");
    expect(recurrenceSummary("bimonthly", "2026-02-05")).toBe("Ogni 2 mesi il giorno 5 (febbraio, aprile, giugno, agosto, ottobre, dicembre)");
  });

  it("describes weekly by weekday and monthly by day", () => {
    expect(recurrenceSummary("weekly", "2026-11-06")).toBe("Ogni settimana di venerdì");
    expect(recurrenceSummary("monthly", "2026-11-06", 27)).toBe("Ogni mese il giorno 27");
  });

  it("prefers the anchored day over the clamped date day", () => {
    expect(recurrenceSummary("quarterly", "2026-02-28", 31)).toContain("il giorno 31");
  });

  it("returns empty for an incomplete date", () => {
    expect(recurrenceSummary("yearly", "")).toBe("");
  });
});
