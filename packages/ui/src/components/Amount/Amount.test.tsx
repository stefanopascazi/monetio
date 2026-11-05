import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Amount } from "./Amount";

describe("Amount", () => {
  it("colors negative values as expense with a true minus", () => {
    render(<Amount cents={-8240} />);
    const el = screen.getByLabelText("−€82.40");
    expect(el).toHaveClass("mio-amount--expense");
  });

  it("prefixes income with +", () => {
    render(<Amount cents={250000} />);
    expect(screen.getByLabelText("+€2,500.00")).toHaveClass("mio-amount--income");
  });

  it("keeps neutral tone without sign for balances", () => {
    render(<Amount cents={4821035} tone="neutral" size="xl" />);
    expect(screen.getByLabelText("€48,210.35")).toHaveClass("mio-amount--neutral");
    expect(screen.getByText(".35")).toHaveClass("mio-amount__fraction");
  });

  it("masks in privacy mode", () => {
    render(<Amount cents={100} hidden />);
    expect(screen.getByLabelText("Amount hidden")).toHaveTextContent("••••••");
  });
});
