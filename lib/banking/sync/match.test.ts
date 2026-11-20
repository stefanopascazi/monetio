import { describe, expect, it } from "vitest";
import { type Candidate, matchMovements } from "./match";
import type { BankMovement } from "./normalize";

const mv = (over: Partial<BankMovement>): BankMovement => ({
  ref: "r1",
  bookedOn: "2026-11-10",
  amountCents: -5000,
  description: "Enel Energia",
  counterpartyIban: null,
  ...over,
});
const cand = (over: Partial<Candidate>): Candidate => ({
  id: "t1",
  bookedOn: "2026-11-10",
  amountCents: -5000,
  description: "Bolletta luce",
  fromRule: true,
  bankRef: null,
  counterpartId: null,
  ...over,
});

describe("matchMovements", () => {
  it("skips movements already synced, also repeated within the batch", () => {
    const d = matchMovements([mv({}), mv({})], [cand({ bankRef: "r1" })]);
    expect(d.map((x) => x.type)).toEqual(["skip", "skip"]);
  });

  it("reconciles a rule booking with the same amount within 5 days", () => {
    expect(matchMovements([mv({ bookedOn: "2026-11-14" })], [cand({})])).toEqual([
      { type: "reconcile", movement: mv({ bookedOn: "2026-11-14" }), transactionIds: ["t1"] },
    ]);
  });

  it("does not reconcile a rule booking too far away or of the opposite sign", () => {
    expect(matchMovements([mv({ bookedOn: "2026-11-20" })], [cand({})])[0].type).toBe("insert");
    expect(matchMovements([mv({ amountCents: 5000 })], [cand({})])[0].type).toBe("insert");
  });

  it("reconciles a manual movement only with the same text or the same day", () => {
    expect(matchMovements([mv({ bookedOn: "2026-11-11", description: "Bolletta luce" })], [cand({ fromRule: false })])[0].type).toBe("reconcile");
    expect(matchMovements([mv({})], [cand({ fromRule: false })])[0].type).toBe("reconcile");
  });

  it("sends a manual movement with other text and a close date to review as a possible duplicate", () => {
    expect(matchMovements([mv({ bookedOn: "2026-11-12" })], [cand({ fromRule: false })])[0]).toMatchObject({
      type: "review",
      reason: "possible_duplicate",
      candidateId: "t1",
    });
  });

  it("sends a rule booking with a different amount within 20% to review", () => {
    expect(matchMovements([mv({ amountCents: -5800 })], [cand({})])[0]).toMatchObject({ type: "review", reason: "amount_differs", candidateId: "t1" });
    expect(matchMovements([mv({ amountCents: -9000 })], [cand({})])[0].type).toBe("insert");
  });

  it("flags two equally close candidates as ambiguous", () => {
    const d = matchMovements([mv({ bookedOn: "2026-11-10" })], [cand({ id: "a", bookedOn: "2026-11-09" }), cand({ id: "b", bookedOn: "2026-11-11" })]);
    expect(d[0]).toMatchObject({ type: "review", reason: "ambiguous", candidateId: null });
  });

  it("picks the closest candidate and uses each one once", () => {
    const d = matchMovements(
      [mv({ ref: "x", bookedOn: "2026-11-10" }), mv({ ref: "y", bookedOn: "2026-11-10" })],
      [cand({ id: "far", bookedOn: "2026-11-13" }), cand({ id: "near", bookedOn: "2026-11-10" })],
    );
    expect(d.map((x) => (x.type === "reconcile" ? x.transactionIds[0] : x.type))).toEqual(["near", "far"]);
  });

  it("skips references already waiting for review", () => {
    expect(matchMovements([mv({})], [], ["r1"])[0].type).toBe("skip");
  });

  it("reconciles a cumulative transfer with the rule movements it pays", () => {
    const rules = [
      cand({ id: "a", amountCents: -20000, counterpartId: "joint" }),
      cand({ id: "b", amountCents: -15000, counterpartId: "joint" }),
      cand({ id: "c", amountCents: -5000, counterpartId: "savings" }),
    ];
    expect(matchMovements([mv({ amountCents: -35000 })], rules)[0]).toEqual({ type: "reconcile", movement: mv({ amountCents: -35000 }), transactionIds: ["a", "b"] });
  });

  it("does not batch movements toward different accounts or outside the window", () => {
    const split = [cand({ id: "a", amountCents: -20000, counterpartId: "joint" }), cand({ id: "b", amountCents: -15000, counterpartId: "savings" })];
    expect(matchMovements([mv({ amountCents: -35000 })], split)[0].type).toBe("insert");
    const far = [cand({ id: "a", amountCents: -20000 }), cand({ id: "b", amountCents: -15000, bookedOn: "2026-11-20" })];
    expect(matchMovements([mv({ amountCents: -35000 })], far)[0].type).toBe("insert");
  });

  it("batches incoming cumulative transfers, skipping movements already reconciled", () => {
    const rules = [cand({ id: "a", amountCents: 10000 }), cand({ id: "b", amountCents: 10000 }), cand({ id: "x", amountCents: 10000, bankRef: "old" })];
    expect(matchMovements([mv({ amountCents: 20000 })], rules)[0]).toMatchObject({ type: "reconcile", transactionIds: ["a", "b"] });
  });

  it("sends a cumulative transfer to review when several combinations fit", () => {
    const rules = [cand({ id: "a", amountCents: -100 }), cand({ id: "b", amountCents: -100 }), cand({ id: "c", amountCents: -100 })];
    expect(matchMovements([mv({ amountCents: -200 })], rules)[0]).toMatchObject({ type: "review", reason: "ambiguous" });
  });

  it("prefers a single exact movement over a batch", () => {
    const rules = [cand({ id: "one", amountCents: -300 }), cand({ id: "a", amountCents: -100 }), cand({ id: "b", amountCents: -200 })];
    expect(matchMovements([mv({ amountCents: -300 })], rules)[0]).toMatchObject({ transactionIds: ["one"] });
  });

  it("inserts movements with nothing to match", () => {
    expect(matchMovements([mv({})], [])[0].type).toBe("insert");
  });
});
