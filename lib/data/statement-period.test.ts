import { describe, expect, it } from "vitest";
import { adjacentMonths, periodLabel, RECENT_LIMIT, statementPeriod } from "./statement-period";

const today = "2026-11-06";
const first = "2024-03-01";

describe("statementPeriod", () => {
  it("defaults to the latest rows", () => {
    expect(statementPeriod({}, today, first)).toEqual({ kind: "recent", limit: RECENT_LIMIT });
    expect(statementPeriod({ mese: "bad", da: "2026-02-30" }, today, first)).toEqual({ kind: "recent", limit: 30 });
  });

  it("parses a month", () => {
    expect(statementPeriod({ mese: "2026-02" }, today, first)).toEqual({ kind: "month", month: "2026-02", from: "2026-02-01", to: "2026-02-28" });
  });

  it("prefers exact dates, closes open bounds and swaps reversed ones", () => {
    expect(statementPeriod({ mese: "2026-02", da: "2026-01-10", a: "2026-01-20" }, today, first)).toEqual({ kind: "range", from: "2026-01-10", to: "2026-01-20" });
    expect(statementPeriod({ da: "2026-10-01" }, today, first)).toEqual({ kind: "range", from: "2026-10-01", to: today });
    expect(statementPeriod({ a: "2025-01-31" }, today, first)).toEqual({ kind: "range", from: first, to: "2025-01-31" });
    expect(statementPeriod({ da: "2026-05-01", a: "2026-04-01" }, today, first)).toEqual({ kind: "range", from: "2026-04-01", to: "2026-05-01" });
  });
});

describe("periodLabel", () => {
  it("labels each kind", () => {
    expect(periodLabel({ kind: "recent", limit: 30 })).toBe("Ultimi 30 movimenti");
    expect(periodLabel({ kind: "month", month: "2026-02", from: "2026-02-01", to: "2026-02-28" })).toBe("febbraio 2026");
    expect(periodLabel({ kind: "range", from: "2026-01-10", to: "2026-01-20" })).toBe("Dal 10 gen 2026 al 20 gen 2026");
  });
});

describe("adjacentMonths", () => {
  it("stops at the bounds", () => {
    expect(adjacentMonths("2026-01", "2024-03", "2026-11")).toEqual({ prev: "2025-12", next: "2026-02" });
    expect(adjacentMonths("2024-03", "2024-03", "2026-11")).toEqual({ prev: null, next: "2024-04" });
    expect(adjacentMonths("2026-11", "2024-03", "2026-11")).toEqual({ prev: "2026-10", next: null });
  });
});
