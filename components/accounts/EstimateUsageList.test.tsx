import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EstimateUsageList } from "./EstimateUsageList";

describe("EstimateUsageList", () => {
  it("lists the movements that reduced the estimate", () => {
    render(
      <EstimateUsageList
        usage={{
          totalCents: 6500,
          usedCents: 2500,
          overCents: 0,
          parts: [
            { id: "a", description: "Farmacia", bookedOn: "2026-11-03", amountCents: -3000, movementCents: -3000 },
            { id: "b", description: "Rimborso", bookedOn: "2026-11-04", amountCents: 500, movementCents: 500 },
          ],
        }}
      />,
    );
    expect(screen.getByText(/^Usati .*25,00.* di .*65,00/)).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Movimenti della stima" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getByText("Rimborso")).toBeInTheDocument();
  });

  it("shows the whole spending and the overflow of an exceeded estimate", () => {
    render(<EstimateUsageList usage={{ totalCents: 28000, usedCents: 28000, overCents: 72729, parts: [{ id: "a", description: "Prelievo", bookedOn: "2026-11-04", amountCents: -100729, movementCents: -100729 }] }} />);
    expect(screen.getByText(/^Usati .*1\.?007,29.* di .*280,00/)).toBeInTheDocument();
    expect(screen.getByText(/oltre la stima di .*727,29/)).toBeInTheDocument();
  });

  it("shows the whole movement when only part of it went into the estimate", () => {
    render(<EstimateUsageList usage={{ totalCents: 30000, usedCents: 30000, overCents: 0, parts: [{ id: "a", description: "Revisione", bookedOn: "2026-11-09", amountCents: -30000, movementCents: -40000 }] }} />);
    expect(screen.getByText(/^di .*400,00/)).toBeInTheDocument();
  });

  it("says when nothing reduced it yet", () => {
    render(<EstimateUsageList usage={{ totalCents: 6500, usedCents: 0, overCents: 0, parts: [] }} />);
    expect(screen.getByText("Nessun movimento ha ancora ridotto la stima.")).toBeInTheDocument();
  });
});
