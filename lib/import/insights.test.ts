import { describe, expect, it } from "vitest";
import type { Category } from "../domain/types";
import type { DraftStatus } from "./classify";
import { buildInsights } from "./insights";

const categories: Category[] = [{ id: "abb", name: "Abbonamenti", kind: "expense", icon: null, colorIndex: 1, archived: false }];
const d = (line: number, bookedOn: string) => ({ line, bookedOn, amountCents: -1399, description: "NETFLIX.COM", category: null });

describe("buildInsights", () => {
  it("suggests categories and finds recurrences across history and new rows only", () => {
    const drafts = [d(1, "2026-10-06"), d(2, "2026-11-06"), d(3, "2026-09-06")];
    const statuses: DraftStatus[] = [{ kind: "new" }, { kind: "possible", match: { bookedOn: "2026-11-05", amountCents: -1399, description: "Netflix" } }, { kind: "duplicate" }];
    const res = buildInsights({
      drafts,
      statuses,
      history: [{ description: "Netflix", amountCents: -1399, categoryId: "abb" }],
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
