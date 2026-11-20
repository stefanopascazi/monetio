import { describe, expect, it } from "vitest";
import type { Decision } from "./match";
import { confirmItems, defaultSelection, previewItems, selectedTotal } from "./preview";

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
