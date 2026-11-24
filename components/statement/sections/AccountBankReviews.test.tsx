import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BankReview } from "@/lib/banking/reviews";
import { AccountBankReviews } from "./AccountBankReviews";

const review = (id: string, accountId: string): BankReview => ({
  id,
  accountId,
  accountName: "Conto",
  bookedOn: "2026-11-20",
  amountCents: -1000,
  description: `Movimento ${id}`,
  reason: "ambiguous",
  candidate: null,
});

vi.mock("@/lib/data/bank-reviews", () => ({ listOpenBankReviews: vi.fn(async () => [review("r1", "acc1"), review("r2", "acc2")]) }));
vi.mock("@/app/actions/bank-reviews", () => ({ resolveBankReview: vi.fn() }));

describe("AccountBankReviews", () => {
  it("lists only this account's movements to review", async () => {
    render(await AccountBankReviews({ accountId: "acc1" }));
    expect(screen.getByText("Da rivedere")).toBeInTheDocument();
    expect(screen.getByText("Movimento r1")).toBeInTheDocument();
    expect(screen.queryByText("Movimento r2")).toBeNull();
  });

  it("renders nothing without movements to review", async () => {
    const { container } = render(await AccountBankReviews({ accountId: "acc3" }));
    expect(container).toBeEmptyDOMElement();
  });
});
