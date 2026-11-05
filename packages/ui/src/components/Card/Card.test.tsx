import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./Card";

describe("Card", () => {
  it("renders title as heading and children", () => {
    render(
      <Card title="Cash flow" subtitle="Last 6 months" action={<button>All</button>}>
        <p>Body</p>
      </Card>,
    );
    expect(screen.getByRole("heading", { name: "Cash flow" })).toBeInTheDocument();
    expect(screen.getByText("Last 6 months")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("omits header without title or action and applies tone", () => {
    const { container } = render(<Card tone="coral">x</Card>);
    expect(container.querySelector(".mio-card__header")).toBeNull();
    expect(container.firstChild).toHaveClass("mio-card--coral");
  });
});
