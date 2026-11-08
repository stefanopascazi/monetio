import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonthEndNote } from "./MonthEndNote";

describe("MonthEndNote", () => {
  it("renders nothing without a value", () => {
    const { container } = render(<MonthEndNote />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the month-end balance, zero included", () => {
    render(<MonthEndNote cents={0} />);
    expect(screen.getByText("Rimanenza a fine mese")).toBeInTheDocument();
  });
});
