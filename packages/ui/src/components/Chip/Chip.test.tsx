import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Chip } from "./Chip";

describe("Chip", () => {
  it("exposes pressed state", () => {
    render(<Chip selected>Groceries</Chip>);
    expect(screen.getByRole("button", { name: "Groceries" })).toHaveAttribute("aria-pressed", "true");
  });

  it("requests toggle on click", async () => {
    const onSel = vi.fn();
    render(<Chip onSelectedChange={onSel}>Groceries</Chip>);
    await userEvent.click(screen.getByRole("button"));
    expect(onSel).toHaveBeenCalledWith(true);
  });
});
