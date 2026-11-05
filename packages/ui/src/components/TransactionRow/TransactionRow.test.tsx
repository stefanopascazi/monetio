import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TransactionRow } from "./TransactionRow";

const base = {
  payee: "Esselunga",
  category: "Groceries",
  categoryIcon: <svg />,
  account: "Joint",
  date: new Date(2026, 10, 3),
  amountCents: -8240,
};

describe("TransactionRow", () => {
  it("renders payee, meta and amount", () => {
    render(<TransactionRow {...base} />);
    expect(screen.getByText("Esselunga")).toBeInTheDocument();
    expect(screen.getByText(/Groceries · Joint · 3 Nov/)).toBeInTheDocument();
    expect(screen.getByLabelText("−€82.40")).toBeInTheDocument();
  });

  it("is a button when clickable", async () => {
    const onClick = vi.fn();
    render(<TransactionRow {...base} onClick={onClick} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });

  it("flags recurring and pending", () => {
    render(<TransactionRow {...base} recurring pending />);
    expect(screen.getByLabelText("Recurring")).toBeInTheDocument();
    expect(screen.getByLabelText("Pending")).toBeInTheDocument();
  });
});
