import { describe, expect, it } from "vitest";
import { advisorContext } from "./fixtures";
import { turnViews } from "./turns";

const row = { id: "r1", question: "Ce la facciamo?", answer: "Sì.", verdict: null, refused: false, payment_plan: false, rating: null };

describe("turnViews", () => {
  it("maps stored rows and drops the ones without text", () => {
    const views = turnViews([row, { ...row, id: "r2", question: null, answer: null }, { ...row, id: "r3", payment_plan: true, rating: -1 }], advisorContext());
    expect(views).toEqual([
      { requestId: "r1", question: "Ce la facciamo?", text: "Sì.", refused: false, verdict: null, paymentPlan: false, rating: null },
      { requestId: "r3", question: "Ce la facciamo?", text: "Sì.", refused: false, verdict: null, paymentPlan: true, rating: -1 },
    ]);
  });

  it("renders the stored engine verdict with account names", () => {
    const verdict = {
      outcome: "yes" as const,
      goal: { label: "Vacanza", amountCents: 100000, date: "2027-01-05", accountId: "joint" },
      lowest: { month: "2027-01", cents: 320000 },
      shortfallCents: 0,
      negativeAccounts: [],
      tight: false,
      levers: [],
    };
    const [view] = turnViews([{ ...row, verdict }], advisorContext());
    expect(view.verdict?.title).toBe("Sì");
    expect(view.verdict?.goal).toContain("Conto comune");
  });
});
