import { describe, expect, it } from "vitest";
import type { Decision } from "./match";
import { applyPicks, confirmItems, defaultSelection, parsePicks, previewItems, type PreviewItem, selectedTotal, withPick } from "./preview";

const mov = (ref: string, bookedOn: string, amountCents: number) =>
  ({ ref, bookedOn, amountCents, description: `Mov ${ref}`, counterpartyIban: null }) as Decision["movement"];

const decisions: Decision[] = [
  { type: "insert", movement: mov("n1", "2026-11-10", -1000), categoryId: "cat1" },
  { type: "insert", movement: mov("n2", "2026-11-12", 5000) },
  { type: "review", movement: mov("r1", "2026-11-11", -200), reason: "possible_duplicate", candidateId: "t9" },
  { type: "reconcile", movement: mov("m1", "2026-11-09", -300), transactionId: "t1", amountChanged: false },
  { type: "skip", movement: mov("k1", "2026-11-08", -400) },
];

describe("previewItems", () => {
  it("groups decisions and sorts newest first", () => {
    expect(previewItems(decisions).map((i) => [i.ref, i.group, i.reason])).toEqual([
      ["n2", "new", null],
      ["r1", "review", "possible_duplicate"],
      ["n1", "new", null],
      ["m1", "matched", null],
      ["k1", "known", null],
    ]);
  });
});

describe("defaultSelection", () => {
  it("selects new and review movements only", () => {
    expect(defaultSelection(previewItems(decisions)).sort()).toEqual(["n1", "n2", "r1"]);
  });
});

describe("confirmItems", () => {
  it("keeps chosen decisions, excludes the rest, always reconciles, drops known", () => {
    expect(confirmItems(decisions, ["n1", "r1"])).toEqual([
      { type: "insert", ref: "n1", booked_on: "2026-11-10", amount_cents: -1000, description: "Mov n1", category_id: "cat1" },
      { type: "exclude", ref: "n2", booked_on: "2026-11-12", amount_cents: 5000, description: "Mov n2" },
      { type: "review", ref: "r1", booked_on: "2026-11-11", amount_cents: -200, description: "Mov r1", reason: "possible_duplicate", candidate_id: "t9" },
      { type: "reconcile", ref: "m1", booked_on: "2026-11-09", amount_cents: -300, description: "Mov m1", transaction_id: "t1" },
    ]);
  });
});

describe("selectedTotal", () => {
  it("sums only the chosen new movements", () => {
    expect(selectedTotal(previewItems(decisions), new Set(["n1", "n2", "r1"]))).toBe(4000);
    expect(selectedTotal(previewItems(decisions), new Set(["n1"]))).toBe(-1000);
  });
});

const item = (ref: string, description: string, amountCents: number, categoryId: string | null, group: PreviewItem["group"] = "new"): PreviewItem => ({
  ref,
  bookedOn: "2026-11-10",
  amountCents,
  description,
  group,
  reason: null,
  categoryId,
});

describe("previewItems categories", () => {
  it("carries the matched category of new movements only", () => {
    expect(previewItems(decisions).map((i) => [i.ref, i.categoryId])).toEqual([
      ["n2", null],
      ["r1", null],
      ["n1", "cat1"],
      ["m1", null],
      ["k1", null],
    ]);
  });
});

describe("withPick", () => {
  const items = [
    item("a", "Bar Roma 10/11", -300, null),
    item("b", "BAR ROMA 11/11", -250, null),
    item("c", "Bar Roma", -250, "manual"),
    item("d", "Bar Roma", 250, null),
    item("e", "Bar Roma", -250, null, "review"),
  ];

  it("applies a category to identical new movements without one", () => {
    expect(withPick(items, "a", "bar").map((i) => i.categoryId)).toEqual(["bar", "bar", "manual", null, null]);
  });

  it("moves identical movements that had the same category as the picked one", () => {
    const once = withPick(items, "a", "bar");
    expect(withPick(once, "a", "food").map((i) => i.categoryId)).toEqual(["food", "food", "manual", null, null]);
  });

  it("clears only the picked movement and ignores unknown refs", () => {
    const once = withPick(items, "a", "bar");
    expect(withPick(once, "b", null).map((i) => i.categoryId)).toEqual(["bar", null, "manual", null, null]);
    expect(withPick(items, "e", "bar")).toBe(items);
  });
});

describe("applyPicks", () => {
  const items = [item("a", "Bar", -300, null), item("b", "Bar", -250, null), item("s", "Stipendio", 1000, null)];
  const valid = (id: string | null, amount: number) => (id === "bar" && amount < 0 ? "bar" : null);

  it("replays picks in order, drops invalid categories and lists the choices to remember", () => {
    const res = applyPicks(items, [["a", "bar"], ["s", "bar"], ["x", "bar"]], valid);
    expect([...res.categories]).toEqual([
      ["a", "bar"],
      ["b", "bar"],
      ["s", null],
    ]);
    expect([...res.remembered]).toEqual([["a", { description: "Bar", amountCents: -300, categoryId: "bar" }]]);
  });

  it("forgets a choice cleared later", () => {
    expect(applyPicks(items, [["a", "bar"], ["a", null]], valid).remembered.size).toBe(0);
  });
});

describe("parsePicks", () => {
  const uuid = "11111111-2222-4333-8444-555555555555";
  it("accepts ref/category pairs and a missing input", () => {
    expect(parsePicks(undefined)).toEqual([]);
    expect(parsePicks([["r1", uuid], ["r2", null]])).toEqual([["r1", uuid], ["r2", null]]);
  });

  it("rejects malformed input", () => {
    expect(parsePicks("x")).toBeNull();
    expect(parsePicks([["r1"]])).toBeNull();
    expect(parsePicks([["r1", "nope"]])).toBeNull();
    expect(parsePicks([["x".repeat(121), uuid]])).toBeNull();
  });
});
