import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonthNetBalance } from "./MonthNetBalance";

describe("MonthNetBalance", () => {
  it("renders nothing when the month has no movements left", () => {
    const { container } = render(<MonthNetBalance recap={{ outCents: 0, inCents: 0, afterOutCents: 100, closingCents: 100 }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the balance after outflows only when nothing comes in", () => {
    render(<MonthNetBalance recap={{ outCents: 500, inCents: 0, afterOutCents: 500, closingCents: 500 }} />);
    expect(screen.getByText("Al netto delle uscite del mese")).toBeInTheDocument();
    expect(screen.queryByText("Previsto a fine mese")).not.toBeInTheDocument();
  });

  it("adds the month-end balance when income is expected", () => {
    render(<MonthNetBalance recap={{ outCents: 500, inCents: 200, afterOutCents: 500, closingCents: 700 }} />);
    expect(screen.getByText("Previsto a fine mese")).toBeInTheDocument();
  });
});
