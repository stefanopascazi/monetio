import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { TransactionForm } from "./TransactionForm";

const accounts = [{ id: "a", name: "Trade Asha" }];
const categories = [{ id: "salute", name: "Salute" }];
const wrap = (defaults: Partial<Parameters<typeof TransactionForm>[0]["defaults"]> = {}) =>
  render(
    <ToastProvider>
      <TransactionForm embedded action={vi.fn(async () => ({}))} accounts={accounts} categories={categories} defaults={{ kind: "expense", accountId: "a", bookedOn: "2026-11-08", ...defaults }} />
    </ToastProvider>,
  );

describe("TransactionForm estimates switch", () => {
  it("appears only once a category is chosen", async () => {
    wrap();
    expect(screen.queryByRole("switch", { name: /Non scalare dalle stime/ })).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText(/Categoria/), "salute");
    expect(screen.getByRole("switch", { name: /Non scalare dalle stime/ })).toBeInTheDocument();
  });

  it("posts the saved flag of a movement being edited", () => {
    const { container } = wrap({ categoryId: "salute", skipEstimates: true });
    expect(container.querySelector<HTMLInputElement>('input[name="skipEstimates"]')?.value).toBe("true");
  });

  it("is not offered for transfers", () => {
    wrap({ kind: "transfer", categoryId: "salute" });
    expect(screen.queryByRole("switch", { name: /Non scalare dalle stime/ })).not.toBeInTheDocument();
  });
});
