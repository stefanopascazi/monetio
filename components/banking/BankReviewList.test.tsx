import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { resolveBankReview } from "@/app/actions/bank-reviews";
import type { BankReview } from "@/lib/banking/reviews";
import { BankReviewList } from "./BankReviewList";

vi.mock("@/app/actions/bank-reviews", () => ({ resolveBankReview: vi.fn(async () => ({ ok: true, message: "Movimento ignorato." })) }));

const review: BankReview = {
  id: "r1",
  accountId: "acc1",
  accountName: "Conto casa",
  bookedOn: "2026-11-11",
  amountCents: -1100,
  description: "ENEL ENERGIA",
  reason: "amount_differs",
  candidate: { id: "t1", bookedOn: "2026-11-10", amountCents: -1000, description: "Bolletta luce" },
};
const wrap = (ui: React.ReactNode) => render(<ToastProvider>{ui}</ToastProvider>);

describe("BankReviewList", () => {
  it("shows the bank movement, why it waits and the recorded candidate", () => {
    wrap(<BankReviewList reviews={[review]} />);
    expect(screen.getByText("ENEL ENERGIA")).toBeInTheDocument();
    expect(screen.getByText(/Conto casa · Importo diverso dal previsto/)).toBeInTheDocument();
    expect(screen.getByText(/Già registrato: Bolletta luce/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "È lo stesso" })).toBeInTheDocument();
  });

  it("resolves with the chosen action", async () => {
    wrap(<BankReviewList reviews={[review]} />);
    await userEvent.click(screen.getByRole("button", { name: "Ignora" }));
    expect(resolveBankReview).toHaveBeenCalledWith("r1", "ignored");
  });

  it("offers no match without a candidate and renders nothing when empty", () => {
    const { rerender, container } = wrap(<BankReviewList reviews={[{ ...review, candidate: null, reason: "ambiguous" }]} />);
    expect(screen.queryByRole("button", { name: "È lo stesso" })).toBeNull();
    rerender(
      <ToastProvider>
        <BankReviewList reviews={[]} />
      </ToastProvider>,
    );
    expect(container.textContent).toBe("");
  });
});
