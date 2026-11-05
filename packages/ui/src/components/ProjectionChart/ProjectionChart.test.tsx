import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectionChart } from "./ProjectionChart";

const data = [
  { label: "Sep", valueCents: 3_000_000 },
  { label: "Oct", valueCents: 3_200_000 },
  { label: "Nov", valueCents: 3_350_000 },
  { label: "Dec", valueCents: 3_500_000, projected: true, lowCents: 3_400_000, highCents: 3_600_000 },
  { label: "Jan", valueCents: 3_650_000, projected: true, lowCents: 3_450_000, highCents: 3_850_000 },
];

describe("ProjectionChart", () => {
  it("draws history, projection and band", () => {
    const { container } = render(<ProjectionChart data={data} />);
    expect(container.querySelector('path[stroke-dasharray]')).not.toBeNull();
    expect(container.querySelectorAll("path")).toHaveLength(3);
    expect(screen.getByText("€36.5K")).toBeInTheDocument();
  });

  it("lists projected rows in the table", () => {
    render(<ProjectionChart data={data} />);
    expect(screen.getByRole("rowheader", { name: "Jan (projected)" })).toBeInTheDocument();
  });

  it("renders nothing with one point", () => {
    const { container } = render(<ProjectionChart data={[data[0]]} />);
    expect(container.firstChild).toBeNull();
  });
});
