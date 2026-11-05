import { describe, expect, it } from "vitest";
import { groupDueByMonth } from "./due-groups";

describe("groupDueByMonth", () => {
  it("groups by month with past, current and next headers", () => {
    const groups = groupDueByMonth(
      [{ date: "2026-12-03" }, { date: "2026-11-10" }, { date: "2026-10-20" }, { date: "2026-11-05" }],
      "2026-11-05",
    );
    expect(groups.map((g) => [g.label, g.tone, g.items.map((i) => i.date)])).toEqual([
      ["ottobre 2026 · arretrate", "past", ["2026-10-20"]],
      ["novembre 2026 · questo mese", "current", ["2026-11-05", "2026-11-10"]],
      ["dicembre 2026", "next", ["2026-12-03"]],
    ]);
  });
});
