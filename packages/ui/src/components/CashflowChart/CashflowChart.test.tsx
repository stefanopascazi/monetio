import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CashflowChart } from "./CashflowChart";

const data = [
  { label: "Oct", incomeCents: 420000, expenseCents: 310000 },
  { label: "Nov", incomeCents: 410000, expenseCents: 450000 },
];

describe("CashflowChart", () => {
  it("renders legend, bars and an accessible table", () => {
    const { container } = render(<CashflowChart data={data} />);
    expect(screen.getAllByText("Income").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("path")).toHaveLength(4);
    expect(screen.getByRole("table", { name: "Cash flow" })).toBeInTheDocument();
  });

  it("shows a tooltip with net on hover", () => {
    const { container } = render(<CashflowChart data={data} />);
    fireEvent.mouseEnter(container.querySelectorAll(".mio-chart__hit")[1]);
    expect(container.querySelector(".mio-tooltip")).toHaveTextContent("Net−€400");
  });
});
