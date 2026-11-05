import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatTile } from "./StatTile";

describe("StatTile", () => {
  it("shows label, value and a good delta", () => {
    const { container } = render(<StatTile label="Income" valueCents={420000} delta={4.2} deltaLabel="vs Oct" />);
    expect(screen.getByText("Income")).toBeInTheDocument();
    expect(screen.getByLabelText("€4,200.00")).toBeInTheDocument();
    expect(container.querySelector(".mio-stat__delta")).toHaveClass("is-good");
  });

  it("marks rising spending as bad", () => {
    const { container } = render(<StatTile label="Spending" valueCents={100} delta={12} upIsGood={false} />);
    expect(container.querySelector(".mio-stat__delta")).toHaveClass("is-bad");
  });

  it("renders a trend sparkline", () => {
    render(<StatTile label="Balance" valueCents={1} trend={[1, 2, 3]} />);
    expect(screen.getByRole("img", { name: "Trend over 3 periods" })).toBeInTheDocument();
  });
});
