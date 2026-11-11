import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import { mapRows } from "./mapping";
import { detectMapping } from "./presets";

// Synthetic samples shaped like the real exports (no personal data).
const REVOLUT_IT = parseCsv(
  [
    "Tipo,Prodotto,Data di inizio,Data di completamento,Descrizione,Importo,Costo,Valuta,State,Saldo",
    "Ricarica,Attuale,2025-01-01 10:00:00,,Ricarica di *0000,1,0,EUR,OPERAZIONE ANNULLATA,",
    "Ricarica,Attuale,2025-01-01 10:01:00,2025-01-01 10:01:30,Ricarica di *0000,50,0,EUR,COMPLETATO,50",
    "Prelievo,Attuale,2025-01-02 12:00:00,2025-01-02 12:00:00,Prelievo contanti,-20,1.5,EUR,COMPLETATO,28.5",
    "Trasferimento,Risparmi,2025-01-03 08:00:00,2025-01-03 08:00:00,Al salvadanaio,10,0,EUR,COMPLETATO,10",
    "Pagamento con carta,Attuale,2025-01-04 09:00:00,,Bar,-2.40,0,EUR,IN SOSPESO,",
  ].join("\n"),
);

const REVOLUT_EN = parseCsv(
  "Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance\nCARD_PAYMENT,Current,2025-01-05 10:22:11,2025-01-06 08:00:00,Coffee,-1.20,0.00,EUR,COMPLETED,98.80",
);

const CHERRY = [
  ["Data contabile", "Valuta", "Dare", "Avere", "Divisa", "Causale", "Descrizione"],
  [new Date(Date.UTC(2025, 0, 3)), new Date(Date.UTC(2025, 0, 1)), -13.99, null, "EUR", "(2", "Pagamenti paesi UE C/O STREAMING"],
  [new Date(Date.UTC(2025, 0, 5)), new Date(Date.UTC(2025, 0, 5)), null, 1500, "EUR", "27", "BONIFICO A VOSTRO FAVORE STIPENDIO"],
  [null, null, null, null, null, null, null],
];

describe("detectMapping", () => {
  it("recognises Revolut (Italian), keeps completed main-account rows and subtracts fees", () => {
    const detected = detectMapping(REVOLUT_IT)!;
    expect(detected.bank).toBe("Revolut");
    const { drafts, skipped } = mapRows(REVOLUT_IT, detected.mapping);
    expect(drafts.map((d) => [d.bookedOn, d.amountCents, d.description])).toEqual([
      ["2025-01-01", 5000, "Ricarica di *0000"],
      ["2025-01-02", -2150, "Prelievo contanti"],
    ]);
    // The running balance of the export matches the imported total.
    expect(drafts.reduce((s, d) => s + d.amountCents, 0)).toBe(2850);
    expect(skipped).toEqual([
      { line: 2, reason: "Operazione non completata" },
      { line: 5, reason: "Movimento di un salvadanaio Revolut" },
      { line: 6, reason: "Operazione non completata" },
    ]);
  });

  it("recognises Revolut in English", () => {
    const detected = detectMapping(REVOLUT_EN)!;
    expect(detected.bank).toBe("Revolut");
    expect(mapRows(REVOLUT_EN, detected.mapping).drafts).toEqual([
      { line: 2, bookedOn: "2025-01-05", amountCents: -120, description: "Coffee", category: null },
    ]);
  });

  it("recognises Cherry Bank and books on the accounting date", () => {
    const detected = detectMapping(CHERRY)!;
    expect(detected.bank).toBe("Cherry Bank");
    expect(mapRows(CHERRY, detected.mapping).drafts.map((d) => [d.bookedOn, d.amountCents])).toEqual([
      ["2025-01-03", -1399],
      ["2025-01-05", 150000],
    ]);
  });

  it("falls back to a generic guess, then to null", () => {
    expect(detectMapping(parseCsv("Data;Descrizione;Importo\n01/01/2025;X;-1"))).toMatchObject({ bank: null, mapping: { headerRow: 0 } });
    expect(detectMapping(parseCsv("a;b\n1;2"))).toBeNull();
  });
});
