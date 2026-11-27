import { describe, expect, it } from "vitest";
import type { ISODate } from "../../domain/types";
import { assignExecutionDates, EMPTY_LEDGER, nextLedger, parseLedger, type PendingLedger } from "./execution";
import type { Decision } from "./match";

const mov = (ref: string, bookedOn: string, amountCents: number) => ({ ref, bookedOn: bookedOn as ISODate, amountCents, description: "Movimento bancario", counterpartyIban: null });
const insert = (ref: string, bookedOn: string, amountCents: number): Decision => ({ type: "insert", movement: mov(ref, bookedOn, amountCents) });
const ledger = (...entries: [string, number][]): PendingLedger => ({ offsetCents: 0, entries: entries.map(([on, amountCents]) => ({ on: on as ISODate, amountCents })) });
const executed = (out: Decision[]) => out.map((d) => (d.type === "insert" ? (d.executedOn ?? null) : null));

describe("assignExecutionDates", () => {
  it("dates a booked movement with the day its outflow was first seen and consumes the entry", () => {
    const out = assignExecutionDates([insert("a", "2026-11-26", -160)], ledger(["2026-11-25", -160]));
    expect(executed(out.decisions)).toEqual(["2026-11-25"]);
    expect(out.ledger.entries).toEqual([]);
  });

  it("takes the oldest entries first for identical amounts", () => {
    const out = assignExecutionDates([insert("a", "2026-11-26", -160), insert("b", "2026-11-26", -160)], ledger(["2026-11-25", -160], ["2026-11-24", -160], ["2026-11-26", -160]));
    expect(executed(out.decisions)).toEqual(["2026-11-24", "2026-11-25"]);
    expect(out.ledger.entries).toEqual([{ on: "2026-11-26", amountCents: -160 }]);
  });

  it("splits a balance drop that held several payments", () => {
    const out = assignExecutionDates([insert("a", "2026-11-26", -160), insert("b", "2026-11-26", -160)], ledger(["2026-11-25", -320]));
    expect(executed(out.decisions)).toEqual(["2026-11-25", "2026-11-25"]);
    expect(out.ledger.entries).toEqual([]);
  });

  it("keeps the booking day without a usable entry: too old, later than booking or too small", () => {
    const out = assignExecutionDates(
      [insert("a", "2026-11-26", -160), insert("b", "2026-11-26", -1000)],
      ledger(["2026-11-15", -160], ["2026-11-27", -160], ["2026-11-25", -100]),
    );
    expect(executed(out.decisions)).toEqual([null, null]);
    expect(out.ledger.entries).toHaveLength(3);
  });

  it("leaves incomes, other decisions and same-day entries alone", () => {
    const decisions: Decision[] = [insert("in", "2026-11-26", 500), { type: "skip", movement: mov("s", "2026-11-26", -160) }, insert("a", "2026-11-26", -160)];
    const out = assignExecutionDates(decisions, ledger(["2026-11-26", -160]));
    expect(executed(out.decisions)).toEqual([null, null, null]);
    expect(out.decisions[2]).not.toHaveProperty("executedOn");
    expect(out.ledger.entries).toEqual([]);
  });
});

describe("nextLedger", () => {
  const today = "2026-11-27" as ISODate;

  it("records a new outflow as the growth of the gap, dated today", () => {
    expect(nextLedger({ ledger: EMPTY_LEDGER, pending: [], gapCents: -160, today })).toEqual({ offsetCents: 0, entries: [{ on: today, amountCents: -160 }] });
    expect(nextLedger({ ledger: ledger(["2026-11-26", -160]), pending: [], gapCents: -480, today }).entries).toEqual([
      { on: "2026-11-26", amountCents: -160 },
      { on: today, amountCents: -320 },
    ]);
  });

  it("keeps the ledger when the gap is unchanged or unknown", () => {
    const l = ledger(["2026-11-26", -160]);
    expect(nextLedger({ ledger: l, pending: [], gapCents: -160, today })).toEqual(l);
    expect(nextLedger({ ledger: l, pending: [], gapCents: null, today })).toEqual(l);
  });

  it("releases an outflow recorded by hand: the exact amount first, else the newest", () => {
    expect(nextLedger({ ledger: ledger(["2026-11-25", -1000], ["2026-11-26", -160]), pending: [], gapCents: -160, today }).entries).toEqual([{ on: "2026-11-26", amountCents: -160 }]);
    expect(nextLedger({ ledger: ledger(["2026-11-25", -1000], ["2026-11-26", -160]), pending: [], gapCents: -900, today }).entries).toEqual([{ on: "2026-11-25", amountCents: -900 }]);
  });

  it("empties when the gap is back to zero or positive", () => {
    expect(nextLedger({ ledger: { offsetCents: -500, entries: [{ on: "2026-11-26", amountCents: -160 }] }, pending: [], gapCents: 200, today })).toEqual(EMPTY_LEDGER);
  });

  it("folds outflows older than the booking lag into the offset and never dates with it", () => {
    const folded = nextLedger({ ledger: ledger(["2026-11-20", -500], ["2026-11-26", -160]), pending: [], gapCents: -660, today });
    expect(folded).toEqual({ offsetCents: -500, entries: [{ on: "2026-11-26", amountCents: -160 }] });
    // The lasting gap does not come back as a new outflow on the next sync.
    expect(nextLedger({ ledger: folded, pending: [], gapCents: -660, today })).toEqual(folded);
    // A new payment on top of it is recorded alone.
    expect(nextLedger({ ledger: folded, pending: [], gapCents: -820, today }).entries).toEqual([
      { on: "2026-11-26", amountCents: -160 },
      { on: today, amountCents: -160 },
    ]);
  });

  it("reduces the offset once the mismatch is fixed", () => {
    expect(nextLedger({ ledger: { offsetCents: -500, entries: [] }, pending: [], gapCents: -200, today })).toEqual({ offsetCents: -200, entries: [] });
  });

  it("uses the bank's pending items and their dates when it lists them", () => {
    const pending = [
      { amountCents: -160, date: "2026-11-26" as ISODate, description: "Pedaggio" },
      { amountCents: 500, date: "2026-11-26" as ISODate, description: "Rimborso" },
      { amountCents: -1000, date: "2026-11-25" as ISODate, description: "Steam" },
    ];
    expect(nextLedger({ ledger: { offsetCents: -300, entries: [] }, pending, gapCents: -9999, today })).toEqual({
      offsetCents: 0,
      entries: [
        { on: "2026-11-25", amountCents: -1000 },
        { on: "2026-11-26", amountCents: -160 },
      ],
    });
  });
});

describe("parseLedger", () => {
  it("reads a stored ledger and drops malformed parts", () => {
    expect(parseLedger(null)).toEqual(EMPTY_LEDGER);
    expect(parseLedger({ offsetCents: -100, entries: [{ on: "2026-11-26", amountCents: -160 }, { on: "x", amountCents: -1 }, { on: "2026-11-26", amountCents: 5 }, null] })).toEqual({
      offsetCents: -100,
      entries: [{ on: "2026-11-26", amountCents: -160 }],
    });
    expect(parseLedger({ offsetCents: 50, entries: "no" })).toEqual(EMPTY_LEDGER);
  });
});
