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

  it("keeps only this account's due movements until month end, sorted by date", () => {
    const r = accountMonthRecap(
      [mv("2026-11-20", -5000, "Luce"), mv("2026-12-01", -100, "Dicembre"), mv("2026-11-10", -2000, "Altro conto", "b"), mv("2026-11-15", 30000, "Stipendio")],
      "a",
      100000,
      today,
    );
    expect(r.due.map((x) => x.label)).toEqual(["Stipendio", "Luce"]);
  });

  it("computes balances from the due movements only , estimates included (paid ones are in the balance)", () => {
    const r = accountMonthRecap(
      [mv("2026-11-20", -5000, "Luce"), mv("2026-11-25", -1000, "Giroconto"), mv("2026-11-28", -2000, "Spesa", "a", { source: "estimate" }), mv("2026-11-27", 3000, "Rimborso")],
      "a",
      10000,
      today,
    );
    expect(r).toMatchObject({ dueTotals: { outCents: 8000, inCents: 3000 }, closingCents: 5000 });
  });

  it("puts overdue items first on the same day and drops zero amounts", () => {
    const r = accountMonthRecap([mv(today, -100, "Oggi"), mv(today, -200, "Arretrato", "a", { overdue: true }), mv("2026-11-09", 0, "Zero")], "a", 0, today);
    expect(r.due.map((x) => [x.label, x.overdue])).toEqual([
      ["Arretrato", true],
      ["Oggi", false],
    ]);
  });

  it("starts a future month from the previous month's closing balance", () => {
    const movements = [mv("2026-11-20", -5000, "Luce"), mv("2026-11-27", 3000, "Rimborso"), mv("2026-12-10", -1000, "Netflix"), mv("2027-01-05", -700, "Gennaio")];
    const nov = accountMonthRecap(movements, "a", 10000, today);
    const dec = accountMonthRecap(movements, "a", 10000, today, "2026-12");
    expect(nov).toMatchObject({ month: "2026-11", openingCents: 10000, closingCents: 8000 });
    expect(dec).toMatchObject({ month: "2026-12", openingCents: nov.closingCents, closingCents: 7000 });
    expect(dec.due.map((x) => x.label)).toEqual(["Netflix"]);
  });

  it("keeps what rule occurrences and planned movements need to be edited", () => {
    const occurrence = { dueDate: "2026-11-20", confirmed: true, note: "bolletta" };
    const r = accountMonthRecap([mv("2026-11-20", -100, "Luce", "a", { ref: "r:l|2026-11", occurrence }), mv("2026-11-25", -50, "Dentista", "a", { source: "planned", txnId: "t1" })], "a", 0, today);
    expect(r.due).toMatchObject([
      { label: "Luce", ref: "r:l|2026-11", occurrence },
      { label: "Dentista", txnId: "t1" },
    ]);
  });

  it("keeps the occurrence key of estimates so they can be closed or booked", () => {
    const r = accountMonthRecap([mv("2026-11-15", -4800, "Psicologa", "a", { source: "estimate", ref: "r:p|2026-11" }), mv("2026-11-20", -100, "Luce")], "a", 0, today);
    expect(r.due.map((x) => x.ref)).toEqual(["r:p|2026-11", undefined]);
  });

  it("lists a used-up decreasing estimate at zero with its usage", () => {
    const usage = { totalCents: 6500, usedCents: 6500, overCents: 0, parts: [{ id: "t", description: "Visita", bookedOn: "2026-11-03", amountCents: -8000, movementCents: -8000 }] };
    const r = accountMonthRecap([mv("2026-11-15", 0, "Psicologa", "a", { source: "estimate", ref: "r:p|2026-11", usage })], "a", 0, today);
    expect(r.due).toMatchObject([{ label: "Psicologa", amountCents: 0, usage }]);
    expect(r.closingCents).toBe(0);
  });

  it("returns the balance unchanged when nothing happens", () => {
    expect(accountMonthRecap([], "a", 500, today)).toMatchObject({ due: [], closingCents: 500 });
  });
});
