import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectionDetail } from "./ProjectionDetail";

const details = [
  { month: "2026-11", byAccount: { a: { openingCents: 1000, closingCents: 800, items: [{ label: "Mutuo", source: "rule" as const, amountCents: -200, count: 1, overdue: false }] } } },
];

describe("ProjectionDetail", () => {
  it("starts with every month closed", () => {
    render(<ProjectionDetail details={details} accounts={[{ id: "a", name: "Conto A" }]} />);
    expect(screen.queryByText("Saldo a fine mese")).toBeNull();
    expect(screen.queryByText("Mutuo")).toBeNull();
    expect(screen.getByText("Fine mese")).toBeInTheDocument();
  });
});
