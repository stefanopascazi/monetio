import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonthRecapList } from "./MonthRecapList";

describe("MonthRecapList", () => {
  it("shows an empty state when nothing is left", () => {
    render(<MonthRecapList recap={{ items: [], outCents: 0, inCents: 0 }} />);
    expect(screen.getByText("Tutto fatto")).toBeInTheDocument();
  });

  it("lists items with source and overdue badges and the totals", () => {
    render(
      <MonthRecapList
        recap={{
          items: [
            { date: "2026-11-08", label: "Affitto", source: "rule", amountCents: -80000, overdue: true },
            { date: "2026-11-20", label: "Spesa", source: "estimate", amountCents: -15000, overdue: false },
            { date: "2026-11-25", label: "Quota casa", source: "contribution", amountCents: 50000, overdue: false },
          ],
          outCents: 95000,
          inCents: 50000,
        }}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("In ritardo")).toBeInTheDocument();
    expect(screen.getByText("arretrato")).toBeInTheDocument();
    expect(screen.getByText("stima")).toBeInTheDocument();
    expect(screen.getByText("quota")).toBeInTheDocument();
    expect(screen.getByText("Uscite")).toBeInTheDocument();
    expect(screen.getByText("Entrate")).toBeInTheDocument();
  });
});
