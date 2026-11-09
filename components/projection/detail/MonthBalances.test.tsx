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

  it("marks every balance as maskable in privacy mode", () => {
    render(
      <>
        <MonthSubtitle openingCents={100} netCents={200} />
        <MonthClosing closingCents={300} />
        <MonthBalances openingCents={400} netCents={500} closingCents={600} />
      </>,
    );
    for (const v of [/1,00/, /2,00/, /3,00/, /4,00/, /5,00/, /6,00/]) expect(screen.getByLabelText(v).closest(".mio-balances")).not.toBeNull();
  });

  it("summarises opening and net in the collapsed row", () => {
    render(<MonthSubtitle openingCents={100000} netCents={2000} />);
    expect(screen.getByText(/Inizio/)).toBeInTheDocument();
    expect(screen.getByLabelText(/20,00/)).toHaveClass("mio-amount--income");
  });
});
