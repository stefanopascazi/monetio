import { describe, expect, it } from "vitest";
import { isReviewAction, mapBankReview, reviewActions } from "./reviews";

const row = {
  id: "r1",
  account_id: "acc1",
  booked_on: "2026-11-11",
  amount_cents: "-1100",
  description: "ENEL",
  reason: "amount_differs",
  account: { name: "Conto casa" },
  candidate: { id: "t1", booked_on: "2026-11-10", amount_cents: "-1000", description: "Bolletta luce" },
};

describe("mapBankReview", () => {
  it("maps numbers, account and candidate", () => {
    expect(mapBankReview(row)).toEqual({
      id: "r1",
      accountId: "acc1",
      accountName: "Conto casa",
      bookedOn: "2026-11-11",
      amountCents: -1100,
      description: "ENEL",
      reason: "amount_differs",
      candidate: { id: "t1", bookedOn: "2026-11-10", amountCents: -1000, description: "Bolletta luce" },
    });
  });

  it("falls back on unknown reasons and missing joins", () => {
    const r = mapBankReview({ ...row, reason: "x", account: null, candidate: null });
    expect(r.reason).toBe("ambiguous");
    expect(r.accountName).toBe("Conto");
    expect(r.candidate).toBeNull();
  });
});

describe("reviewActions", () => {
  it("offers the match only with a candidate", () => {
    expect(reviewActions({ candidate: null })).toEqual(["added", "ignored"]);
    expect(reviewActions({ candidate: { id: "t", bookedOn: "", amountCents: 0, description: "" } })).toEqual(["matched", "added", "ignored"]);
  });
});

describe("isReviewAction", () => {
  it("accepts only known actions", () => {
    expect(isReviewAction("ignored")).toBe(true);
    expect(isReviewAction("delete")).toBe(false);
  });
});
