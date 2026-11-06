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

  it("omits institution when missing", () => {
    render(<AccountHeader name="Contanti" context="Conto condiviso" balanceCents={0} />);
    expect(screen.getByText("Conto condiviso")).toBeInTheDocument();
  });
});
