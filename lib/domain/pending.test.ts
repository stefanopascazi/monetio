import { describe, expect, it } from "vitest";
import type { Movement } from "./projection";
import { settlePending, withPendingStart } from "./pending";

const today = "2026-11-24";
const mv = (over: Partial<Movement>): Movement => ({ date: today, accountId: "acc1", amountCents: -1000, label: "x", source: "planned", ...over });

describe("settlePending", () => {
  it("drops a due outflow the pending payment already covers", () => {
    const due = mv({ label: "Bolletta", amountCents: -4950, source: "rule", overdue: true });
    const later = mv({ label: "Affitto", date: "2026-11-28", amountCents: -50000 });
    const out = settlePending([due, later], { acc1: { items: [{ amountCents: -5000, categoryId: null }] } }, today);
    expect(out.map((m) => m.label)).toEqual(["Affitto"]);
  });

  it("shrinks the estimate of the payment's category instead of counting it twice", () => {
    const estimate = mv({ label: "Spesa", amountCents: -10000, source: "estimate", categoryId: "cat-spesa" });
    const out = settlePending([estimate], { acc1: { items: [{ amountCents: -1000, categoryId: "cat-spesa" }] } }, today);
    expect(out).toEqual([{ ...estimate, amountCents: -9000 }]);
  });

  it("removes an estimate the payment uses up", () => {
    const estimate = mv({ amountCents: -500, source: "estimate", categoryId: "c" });
    expect(settlePending([estimate], { acc1: { items: [{ amountCents: -1000, categoryId: "c" }] } }, today)).toEqual([]);
  });

  it("keeps everything for an unexpected payment and for other accounts", () => {
    const other = mv({ accountId: "acc2", amountCents: -1000 });
    const future = mv({ date: "2026-11-30", amountCents: -1000 });
    const out = settlePending([other, future], { acc1: { items: [{ amountCents: -1000, categoryId: null }] } }, today);
    expect(out).toHaveLength(2);
  });

  it("without a list, drops due outflows that fit in the pending total", () => {
    const small = mv({ label: "Parcheggio", amountCents: -300 });
    const big = mv({ label: "Assicurazione", amountCents: -20000 });
    const out = settlePending([small, big], { acc1: { totalCents: -1000 } }, today);
    expect(out.map((m) => m.label)).toEqual(["Assicurazione"]);
  });
});

describe("withPendingStart", () => {
  it("lowers the start by pending outflows only", () => {
    expect(withPendingStart({ acc1: 9719, acc2: 100 }, { acc1: -1000, acc2: 500, gone: -1 })).toEqual({ acc1: 8719, acc2: 100 });
  });
});
