import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonthBalances, MonthClosing, MonthSubtitle } from "./MonthBalances";

describe("MonthBalances", () => {
  it("shows opening, net and month-end balance", () => {
    render(<MonthBalances openingCents={100000} netCents={-25000} closingCents={75000} />);
    expect(screen.getByText("Saldo iniziale")).toBeInTheDocument();
    expect(screen.getByText("Variazione del mese")).toBeInTheDocument();
    expect(screen.getByText("Saldo a fine mese")).toBeInTheDocument();
    expect(screen.getByLabelText(/750,00/)).toHaveClass("mio-amount--xl");
  });

  it("marks a negative month-end balance as expense", () => {
    render(<MonthClosing closingCents={-500} />);
    expect(screen.getByText("Fine mese")).toBeInTheDocument();
    expect(screen.getByLabelText(/5,00/)).toHaveClass("mio-amount--expense");
  });

  it("summarises opening and net in the collapsed row", () => {
    render(<MonthSubtitle openingCents={100000} netCents={2000} />);
    expect(screen.getByText(/Inizio/)).toBeInTheDocument();
    expect(screen.getByLabelText(/20,00/)).toHaveClass("mio-amount--income");
  });
});
