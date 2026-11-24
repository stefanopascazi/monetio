import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BankBalancesNote } from "./BankBalancesNote";

describe("BankBalancesNote", () => {
  it("shows booked and available balance", () => {
    render(<BankBalancesNote bank={{ currentCents: 9719, availableCents: 8719 }} />);
    expect(screen.getByText("Saldo contabile")).toBeInTheDocument();
    expect(screen.getByText("Saldo disponibile")).toBeInTheDocument();
  });

  it("renders nothing without bank balances", () => {
    const { container } = render(<BankBalancesNote />);
    expect(container).toBeEmptyDOMElement();
  });
});
