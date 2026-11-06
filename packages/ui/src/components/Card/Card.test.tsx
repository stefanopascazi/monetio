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

describe("Card collapsible", () => {
  it("folds and unfolds the body with the chevron", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    render(
      <Card title="Andamento" collapsible action={<button>Anno</button>}>
        <p>Grafico</p>
      </Card>,
    );
    const toggle = screen.getByRole("button", { expanded: true });
    expect(screen.getByText("Grafico")).toBeVisible();
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Grafico")).not.toBeVisible();
    expect(screen.queryByRole("button", { name: "Anno" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Andamento" })).toBeInTheDocument();
    await userEvent.click(toggle);
    expect(screen.getByText("Grafico")).toBeVisible();
  });

  it("starts folded with defaultOpen false", () => {
    render(
      <Card title="Andamento" collapsible defaultOpen={false}>
        <p>Grafico</p>
      </Card>,
    );
    expect(screen.getByRole("button", { expanded: false })).toBeInTheDocument();
    expect(screen.getByText("Grafico")).not.toBeVisible();
  });
});
