import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonthNetBalance } from "./MonthNetBalance";

const recap = (outCents: number, inCents: number) => ({ dueTotals: { outCents, inCents }, afterOutCents: 100, closingCents: 100 });

describe("MonthNetBalance", () => {
  it("renders nothing when the month has no movements left", () => {
    const { container } = render(<MonthNetBalance recap={recap(0, 0)} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows both balances when money still goes out", () => {
    render(<MonthNetBalance recap={recap(500, 200)} />);
    expect(screen.getByText("Al netto delle uscite del mese")).toBeInTheDocument();
    expect(screen.getByText("Rimanenza a fine mese")).toBeInTheDocument();
  });

  it("shows only the month-end balance when only income is expected", () => {
    render(<MonthNetBalance recap={recap(0, 200)} />);
    expect(screen.queryByText("Al netto delle uscite del mese")).not.toBeInTheDocument();
    expect(screen.getByText("Rimanenza a fine mese")).toBeInTheDocument();
  });
});
