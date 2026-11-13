import { describe, expect, it } from "vitest";
import { advisorContext } from "./fixtures";
import type { AdvisorVerdict } from "./tools";
import { verdictView } from "./view";

const base: AdvisorVerdict = {
  outcome: "yes_if",
  goal: { label: "Vacanza", amountCents: 450000, date: "2027-01-05", accountId: "joint" },
  lowest: { month: "2027-01", cents: -30000 },
  shortfallCents: 30000,
  tight: false,
  levers: [
    { kind: "postpone", date: "2027-02-05" },
    { kind: "reduce", amountCents: 420000 },
    { kind: "cut", categoryId: "food", percent: 17 },
  ],
};

const plain = (s: string) => s.replace(/\s/g, " ");

describe("verdictView", () => {
  // it-IT groups thousands only from five digits.
  it("lists the goal, the lowest point, the gap and each lever in Italian", () => {
    const v = verdictView(base, advisorContext());
    expect(v.title).toBe("Sì, se…");
    expect(v.tone).toBe("warning");
    expect(plain(v.goal)).toBe("Vacanza: 4500,00 € il 5 gen 2027 da Conto comune");
    expect(v.lines.map(plain)).toEqual([
      "Punto più basso previsto: −300,00 € a fine gennaio 2027.",
      "Mancano 300,00 €.",
      "Rimandando al 5 feb 2027.",
      "Spendendo al massimo 4200 €.",
      "Tagliando Ristoranti del 17% da oggi.",
    ]);
  });

  it("downgrades a tight yes to a warning", () => {
    const v = verdictView({ ...base, outcome: "yes", shortfallCents: 0, tight: true, levers: [], lowest: { month: "2027-01", cents: 20000 } }, advisorContext());
    expect(v).toMatchObject({ title: "Sì", tone: "warning" });
    expect(v.lines).toContain("Margine stretto: con dati incompleti il risultato può cambiare.");
  });
});
