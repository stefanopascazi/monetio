import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChartLegend, ChartTable, ChartTooltip } from "./ChartParts";

describe("ChartParts", () => {
  it("renders legend labels and values", () => {
    render(<ChartLegend items={[{ label: "Income", color: "red", value: "€10" }]} />);
    expect(screen.getByText("Income")).toBeInTheDocument();
    expect(screen.getByText("€10")).toBeInTheDocument();
  });

  it("flips tooltip near the right edge", () => {
    const { container } = render(<ChartTooltip x={500} y={10} containerWidth={600} title="Nov" rows={[{ label: "Net", value: "€1" }]} />);
    expect((container.firstChild as HTMLElement).style.transform).toContain("-100%");
  });

  it("renders an accessible table", () => {
    render(<ChartTable caption="Cash flow" headers={["Month", "Income"]} rows={[["Nov", "€1"]]} />);
    expect(screen.getByRole("table", { name: "Cash flow" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Nov" })).toBeInTheDocument();
  });
});
