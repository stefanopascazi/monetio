import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders label and variant classes", () => {
    render(<Button variant="secondary" size="lg">Save</Button>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toHaveClass("mio-btn--secondary", "mio-btn--lg");
    expect(btn).toHaveAttribute("type", "button");
  });

  it("fires onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Add</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled and busy while loading", () => {
    render(<Button loading>Saving</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
  });

  it("hides label in iconOnly mode", () => {
    render(<Button iconOnly aria-label="Add" iconStart={<svg />}>Add</Button>);
    expect(screen.getByRole("button", { name: "Add" })).toHaveClass("mio-btn--icon");
    expect(screen.queryByText("Add")).toBeNull();
  });
});
