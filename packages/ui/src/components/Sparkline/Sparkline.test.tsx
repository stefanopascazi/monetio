import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Sparkline } from "./Sparkline";

describe("Sparkline", () => {
  it("renders an accessible svg with endpoint", () => {
    const { container } = render(<Sparkline data={[1, 3, 2, 5]} aria-label="Balance rising" />);
    expect(screen.getByRole("img", { name: "Balance rising" })).toBeInTheDocument();
    expect(container.querySelector("circle")).not.toBeNull();
  });

  it("renders nothing with fewer than two points", () => {
    const { container } = render(<Sparkline data={[1]} aria-label="x" />);
    expect(container.firstChild).toBeNull();
  });
});
