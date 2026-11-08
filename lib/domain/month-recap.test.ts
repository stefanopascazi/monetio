import { describe, expect, it } from "vitest";
import { accountMonthRecap } from "./month-recap";
import type { Movement } from "./projection";

const mv = (date: string, amountCents: number, label: string, accountId = "a", extra: Partial<Movement> = {}): Movement => ({
  date,
  accountId,
  amountCents,
  label,
  source: "rule",
  ...extra,
});

describe("accountMonthRecap", () => {
  const today = "2026-11-08";

  it("keeps only this account's movements until month end, sorted by date", () => {
    const r = accountMonthRecap(
      [mv("2026-11-20", -5000, "Luce"), mv("2026-12-01", -100, "Dicembre"), mv("2026-11-10", -2000, "Altro conto", "b"), mv("2026-11-15", 30000, "Stipendio")],
      "a",
      100000,
      today,
    );
    expect(r.items.map((x) => x.label)).toEqual(["Stipendio", "Luce"]);
  });

  it("computes totals and balances after outflows and at month end", () => {
    const r = accountMonthRecap([mv("2026-11-20", -5000, "Luce"), mv("2026-11-25", -1000, "Giroconto"), mv("2026-11-27", 3000, "Rimborso")], "a", 10000, today);
    expect(r).toMatchObject({ outCents: 6000, inCents: 3000, afterOutCents: 4000, closingCents: 7000 });
  });

  it("puts overdue items first on the same day and drops zero amounts", () => {
    const r = accountMonthRecap([mv(today, -100, "Oggi"), mv(today, -200, "Arretrato", "a", { overdue: true }), mv("2026-11-09", 0, "Zero")], "a", 0, today);
    expect(r.items.map((x) => [x.label, x.overdue])).toEqual([
      ["Arretrato", true],
      ["Oggi", false],
    ]);
  });

  it("returns the balance unchanged when nothing is left", () => {
    expect(accountMonthRecap([], "a", 500, today)).toEqual({ items: [], outCents: 0, inCents: 0, afterOutCents: 500, closingCents: 500 });
  });
});
