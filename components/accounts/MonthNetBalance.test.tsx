import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonthNetBalance } from "./MonthNetBalance";

describe("MonthNetBalance", () => {
  it("shows only the month-end balance", () => {
    render(<MonthNetBalance recap={{ closingCents: 266959 }} />);
    expect(screen.getByText("Rimanenza a fine mese")).toBeInTheDocument();
    expect(screen.queryByText("Al netto delle uscite del mese")).not.toBeInTheDocument();
  });
});
