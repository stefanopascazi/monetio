import { describe, expect, it } from "vitest";
import { classifyDrafts } from "./classify";

const m = (bookedOn: string, amountCents: number, description: string) => ({ bookedOn, amountCents, description });

describe("classifyDrafts", () => {
  it("marks movements covered by the opening balance (up to its date)", () => {
    const res = classifyDrafts([m("2025-01-31", -100, "A"), m("2025-02-01", -100, "B")], [], "2025-01-31");
    expect(res.map((s) => s.kind)).toEqual(["beforeOpening", "new"]);
  });

  it("finds exact duplicates as a multiset", () => {
    const drafts = [m("2025-02-02", -120, "Bar"), m("2025-02-02", -120, "BAR"), m("2025-02-03", -500, "Spesa")];
    const res = classifyDrafts(drafts, [m("2025-02-02", -120, "bar")], "2025-01-01");
    expect(res.map((s) => s.kind)).toEqual(["duplicate", "new", "new"]);
  });

  it("flags same amount within the window as a possible duplicate, nearest first", () => {
    const existing = [m("2025-02-01", -7635, "Bolletta Hera"), m("2025-02-09", -7635, "Altro")];
    const res = classifyDrafts([m("2025-02-04", -7635, "ADDEBITO DIRETTO HERA")], existing, "2025-01-01");
    expect(res).toEqual([{ kind: "possible", match: existing[0] }]);
  });

  it("ignores different amounts and dates outside the window", () => {
    const existing = [m("2025-02-01", -100, "A")];
    const res = classifyDrafts([m("2025-02-06", -100, "B"), m("2025-02-01", -101, "C")], existing, "2025-01-01");
    expect(res.map((s) => s.kind)).toEqual(["new", "new"]);
  });

  it("matches each existing movement once and never reuses an exact one", () => {
    const existing = [m("2025-02-01", -100, "Bar")];
    const res = classifyDrafts([m("2025-02-02", -100, "Caffè"), m("2025-02-01", -100, "Bar")], existing, "2025-01-01");
    expect(res.map((s) => s.kind)).toEqual(["new", "duplicate"]);
  });

  it("treats the giroconto side created by the other statement as already present", () => {
    const mirror = { ...m("2025-02-03", 80000, "Bonifico a Revolut"), importedMirror: true };
    const res = classifyDrafts([m("2025-02-05", 80000, "Ricarica da Cherry"), m("2025-02-05", 80000, "Altra ricarica")], [mirror], "2025-01-01");
    expect(res.map((s) => s.kind)).toEqual(["duplicate", "new"]);
    expect(classifyDrafts([m("2025-02-07", 80000, "Tardiva")], [mirror], "2025-01-01")[0].kind).toBe("possible");
  });
});
