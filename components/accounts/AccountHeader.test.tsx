import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccountHeader } from "./AccountHeader";

describe("AccountHeader", () => {
  it("shows name as h1, settings slot, context with institution", () => {
    render(<AccountHeader name="Conto cointestato" context="Conto condiviso" institution="Intesa" balanceCents={12345} settings={<button>Gear</button>} />);
    expect(screen.getByRole("heading", { level: 1, name: "Conto cointestato" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gear" })).toBeInTheDocument();
    expect(screen.getByText("Conto condiviso · Intesa")).toBeInTheDocument();
  });

  it("keeps name and settings in a title row that scrolls with the page", () => {
    render(<AccountHeader name="Contanti" context="Conto condiviso" balanceCents={0} settings={<button>Gear</button>} />);
    const bar = screen.getByTestId("account-title-bar");
    expect(bar).not.toHaveClass("sticky");
    expect(bar).toContainElement(screen.getByRole("heading", { level: 1 }));
    expect(bar).toContainElement(screen.getByRole("button", { name: "Gear" }));
  });

  it("marks the balance as maskable in privacy mode", () => {
    render(<AccountHeader name="Contanti" context="Conto condiviso" balanceCents={500} />);
    expect(screen.getByLabelText(/5,00/).closest(".mio-balances")).not.toBeNull();
  });

  it("omits institution when missing", () => {
    render(<AccountHeader name="Contanti" context="Conto condiviso" balanceCents={0} />);
    expect(screen.getByText("Conto condiviso")).toBeInTheDocument();
  });
});
