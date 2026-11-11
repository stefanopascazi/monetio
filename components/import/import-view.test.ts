import { describe, expect, it } from "vitest";
import type { DraftStatus } from "@/lib/import/classify";
import { categoriesFor, categoryPayload, columnLetter, effectiveCategory, frequencyLabel, columnOptions, fallbackMapping, headerRowOptions, isLinked, isSelected, summarize, transferLinks } from "./import-view";

describe("columnLetter", () => {
  it.each([
    [0, "A"],
    [25, "Z"],
    [26, "AA"],
    [51, "AZ"],
    [701, "ZZ"],
  ])("%i -> %s", (i, s) => expect(columnLetter(i)).toBe(s));
});

describe("options", () => {
  const grid = [["Estratto conto"], ["Data", "", "Importo"], ["01/01/2025", "x", "-1"]];

  it("labels columns with letter and header", () => {
    expect(columnOptions(grid, 1).map((o) => o.label)).toEqual(["A · Data", "B · (senza titolo)", "C · Importo"]);
  });

  it("previews candidate header rows", () => {
    expect(headerRowOptions(grid).map((o) => o.label)).toEqual(["Riga 1: Estratto conto", "Riga 2: Data, Importo", "Riga 3: 01/01/2025, x, -1"]);
    expect(headerRowOptions([[]])[0].label).toBe("Riga 1: (vuota)");
  });

  it("builds a fallback mapping within the grid width", () => {
    expect(fallbackMapping(grid)).toEqual({ headerRow: 0, date: 0, description: 1, amount: { mode: "signed", column: 2 } });
    expect(fallbackMapping([["only"]])).toEqual({ headerRow: 0, date: 0, description: 0, amount: { mode: "signed", column: 0 } });
  });
});

describe("selection", () => {
  const fresh: DraftStatus = { kind: "new" };
  const possible: DraftStatus = { kind: "possible", match: { bookedOn: "2025-01-01", amountCents: -1, description: "x" } };

  it("selects new rows by default, possible ones only on request, others never", () => {
    expect(isSelected(1, fresh, new Map())).toBe(true);
    expect(isSelected(1, fresh, new Map([[1, false]]))).toBe(false);
    expect(isSelected(1, possible, new Map())).toBe(false);
    expect(isSelected(1, possible, new Map([[1, true]]))).toBe(true);
    expect(isSelected(1, { kind: "duplicate" }, new Map([[1, true]]))).toBe(false);
    expect(isSelected(1, undefined, new Map())).toBe(false);
  });

  it("summarises the chosen rows and counts the excluded ones", () => {
    const drafts = [
      { line: 1, bookedOn: "2025-01-05", amountCents: -100, description: "a", category: null },
      { line: 2, bookedOn: "2025-01-02", amountCents: 500, description: "b", category: null },
      { line: 3, bookedOn: "2025-01-03", amountCents: -7, description: "c", category: null },
      { line: 4, bookedOn: "2024-12-01", amountCents: -9, description: "d", category: null },
      { line: 5, bookedOn: "2025-01-04", amountCents: -3, description: "e", category: null },
    ];
    const statuses: DraftStatus[] = [fresh, fresh, possible, { kind: "beforeOpening" }, { kind: "duplicate" }];
    expect(summarize(drafts, statuses, new Map())).toEqual({ count: 2, totalCents: 400, from: "2025-01-02", to: "2025-01-05", duplicates: 1, possible: 1, beforeOpening: 1, transfers: 0 });
    expect(summarize(drafts, statuses, new Map([[3, true]])).count).toBe(3);
  });
});

describe("giroconti", () => {
  const match = { id: "t1", accountId: "cherry", accountName: "Cherry", bookedOn: "2025-01-02", amountCents: -800, description: "Ricarica", categoryId: null };
  const transfer: DraftStatus = { kind: "transfer", match };
  const drafts = [
    { line: 1, bookedOn: "2025-01-02", amountCents: 800, description: "Ricarica di *3210", category: null },
    { line: 2, bookedOn: "2025-01-03", amountCents: -5, description: "Bar", category: null },
  ];
  const statuses: DraftStatus[] = [transfer, { kind: "new" }];

  it("selects and links giroconti by default", () => {
    expect(isSelected(1, transfer, new Map())).toBe(true);
    expect(isLinked(1, transfer, new Map(), new Set())).toBe(true);
    expect(isLinked(1, transfer, new Map(), new Set([1]))).toBe(false);
    expect(isLinked(1, transfer, new Map([[1, false]]), new Set())).toBe(false);
    expect(isLinked(2, { kind: "new" }, new Map(), new Set())).toBe(false);
  });

  it("sends links only for selected, linked rows and counts them", () => {
    expect(transferLinks(drafts, statuses, new Map(), new Set())).toEqual([{ line: 1, transactionId: "t1" }]);
    expect(transferLinks(drafts, statuses, new Map(), new Set([1]))).toEqual([]);
    expect(summarize(drafts, statuses, new Map()).transfers).toBe(1);
    expect(summarize(drafts, statuses, new Map(), new Set([1]))).toMatchObject({ transfers: 0, count: 2 });
  });

  it("links giroconti whose other side gets created to their account", () => {
    const created: DraftStatus = { kind: "transferNew", account: { id: "acc-cherry", name: "Cherry" }, via: "iban" };
    expect(isSelected(1, created, new Map())).toBe(true);
    expect(transferLinks(drafts, [created, { kind: "new" }], new Map(), new Set())).toEqual([{ line: 1, accountId: "acc-cherry" }]);
    expect(summarize(drafts, [created, { kind: "new" }], new Map()).transfers).toBe(1);
  });
});

describe("categories in the preview", () => {
  const cats = [
    { id: "spesa", name: "Spesa", kind: "expense" as const },
    { id: "stip", name: "Stipendio", kind: "income" as const },
    { id: "extra", name: "Extra", kind: "both" as const },
  ];

  it("offers categories matching the direction of money", () => {
    expect(categoriesFor(-1, cats).map((c) => c.id)).toEqual(["spesa", "extra"]);
    expect(categoriesFor(1, cats).map((c) => c.id)).toEqual(["stip", "extra"]);
  });

  it("prefers the user's pick, then the suggestion", () => {
    const sugg = new Map([[1, "spesa"]]);
    expect(effectiveCategory(1, new Map(), sugg)).toBe("spesa");
    expect(effectiveCategory(1, new Map([[1, ""]]), sugg)).toBe("");
    expect(effectiveCategory(2, new Map(), sugg)).toBe("");
    const drafts = [
      { line: 1, bookedOn: "2025-01-01", amountCents: -1, description: "a", category: null },
      { line: 2, bookedOn: "2025-01-01", amountCents: -1, description: "b", category: null },
    ];
    expect(categoryPayload(drafts, new Map([[2, "extra"]]), sugg)).toEqual([
      { line: 1, categoryId: "spesa" },
      { line: 2, categoryId: "extra" },
    ]);
  });

  it("labels frequencies", () => {
    expect(frequencyLabel("bimonthly")).toBe("ogni 2 mesi");
  });
});
