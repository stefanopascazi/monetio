import { describe, expect, it } from "vitest";
import type { Category } from "../domain/types";
import type { DraftStatus } from "./classify";
import { buildInsights, suggestCategories } from "./insights";

const categories: Category[] = [
  { id: "abb", name: "Abbonamenti", kind: "expense", icon: null, colorIndex: 1, archived: false },
  { id: "stip", name: "Stipendio", kind: "income", icon: null, colorIndex: 2, archived: false },
  { id: "old", name: "Vecchia", kind: "expense", icon: null, colorIndex: 3, archived: true },
];
const d = (line: number, bookedOn: string) => ({ line, bookedOn, amountCents: -1399, description: "NETFLIX.COM", category: null });
const netflix = { key: "netflix com", direction: -1 as const, categoryId: "abb" };

describe("buildInsights", () => {
  it("suggests matched categories and finds recurrences across history and new rows only", () => {
    const drafts = [d(1, "2026-10-06"), d(2, "2026-11-06"), d(3, "2026-09-06")];
    const statuses: DraftStatus[] = [{ kind: "new" }, { kind: "possible", match: { bookedOn: "2026-11-05", amountCents: -1399, description: "Netflix" } }, { kind: "duplicate" }];
    const res = buildInsights({
      drafts,
      statuses,
      matches: [netflix],
      accountHistory: [{ bookedOn: "2026-09-06", amountCents: -1399, description: "Netflix", categoryId: "abb" }],
      rules: [],
      categories,
      today: "2026-11-11",
    });
    expect(res.suggestions).toEqual([
      [1, "abb"],
      [2, "abb"],
      [3, "abb"],
    ]);
    // The duplicate row (line 3) is already in the history: three months, not four occurrences.
    expect(res.recurring).toHaveLength(1);
    expect(res.recurring[0]).toMatchObject({ occurrences: 3, categoryId: "abb", startDate: "2026-12-06" });
  });
});

describe("suggestCategories", () => {
  it("prefers the category named in the file, then the account match", () => {
    const drafts = [
      { line: 1, bookedOn: "2026-11-01", amountCents: 200000, description: "NETFLIX.COM", category: "Stipendio" },
      { line: 2, bookedOn: "2026-11-01", amountCents: -1399, description: "Netflix.com 06/11", category: null },
    ];
    expect([...suggestCategories(drafts, [netflix], categories)]).toEqual([
      [1, "stip"],
      [2, "abb"],
    ]);
  });

  it("never guesses: similar but not identical descriptions, other direction or archived categories get nothing", () => {
    const drafts = [
      { line: 1, bookedOn: "2026-11-01", amountCents: -1399, description: "Netflix abbonamento", category: null },
      { line: 2, bookedOn: "2026-11-01", amountCents: 1399, description: "NETFLIX.COM", category: null },
      { line: 3, bookedOn: "2026-11-01", amountCents: -100, description: "Vecchio", category: null },
    ];
    expect(suggestCategories(drafts, [netflix, { key: "vecchio", direction: -1, categoryId: "old" }], categories).size).toBe(0);
  });
});
