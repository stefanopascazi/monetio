import { describe, expect, it } from "vitest";
import { BATCH_MAX_ITEMS, type BatchItem, batchCombos, pickBatch } from "./batch";

const item = (id: string, amountCents: number, over: Partial<BatchItem> = {}): BatchItem => ({
  id,
  bookedOn: "2026-11-10",
  amountCents,
  counterpartId: "joint",
  ...over,
});
const ids = (combos: BatchItem[][]) => combos.map((c) => c.map((i) => i.id));

describe("batchCombos", () => {
  it("finds the combinations of two or more items adding up to the amount", () => {
    expect(ids(batchCombos(-300, "2026-11-10", [item("a", -100), item("b", -200), item("c", -50)]))).toEqual([["a", "b"]]);
  });

  it("ignores items of the opposite sign, as large as the whole, or alone", () => {
    expect(batchCombos(-300, "2026-11-10", [item("a", -300), item("b", 100), item("c", -400)])).toEqual([]);
  });

  it("never mixes counterparts", () => {
    expect(batchCombos(-300, "2026-11-10", [item("a", -100), item("b", -200, { counterpartId: null })])).toEqual([]);
    expect(ids(batchCombos(-300, "2026-11-10", [item("a", -100, { counterpartId: null }), item("b", -200, { counterpartId: null })]))).toEqual([["a", "b"]]);
  });

  it("searches only the items closest in date", () => {
    const near = Array.from({ length: BATCH_MAX_ITEMS }, (_, i) => item(`n${i}`, -7));
    const far = [item("f1", -10, { bookedOn: "2026-11-15" }), item("f2", -20, { bookedOn: "2026-11-15" })];
    expect(batchCombos(-30, "2026-11-10", [...far, ...near])).toEqual([]);
    expect(batchCombos(-30, "2026-11-10", far)).toHaveLength(1);
  });
});

describe("pickBatch", () => {
  const a = item("a", -100);
  const b = item("b", -200);
  const c = item("c", -100, { bookedOn: "2026-11-12" });

  it("returns null without combinations and the only one when unique", () => {
    expect(pickBatch([])).toBeNull();
    expect(pickBatch([[a, b]])).toEqual([a, b]);
  });

  it("prefers the only combination on a single day, else ambiguous", () => {
    expect(pickBatch([[a, b], [c, b]])).toEqual([a, b]);
    expect(pickBatch([[a, b], [a, item("d", -200)]])).toBe("ambiguous");
  });
});
