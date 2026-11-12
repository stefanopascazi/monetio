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
          parts: [
            { id: "a", description: "Farmacia", bookedOn: "2026-11-03", amountCents: -3000 },
            { id: "b", description: "Rimborso", bookedOn: "2026-11-04", amountCents: 500 },
          ],
        }}
      />,
    );
    expect(screen.getByText(/^Usati .*25,00.* di .*65,00/)).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Movimenti della stima" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getByText("Rimborso")).toBeInTheDocument();
  });

  it("says when nothing reduced it yet", () => {
    render(<EstimateUsageList usage={{ totalCents: 6500, usedCents: 0, parts: [] }} />);
    expect(screen.getByText("Nessun movimento ha ancora ridotto la stima.")).toBeInTheDocument();
  });
});
