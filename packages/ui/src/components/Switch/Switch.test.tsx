import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Switch } from "./Switch";

describe("Switch", () => {
  it("toggles and reports state", async () => {
    const onChange = vi.fn();
    render(<Switch label="Hide balances" onCheckedChange={onChange} />);
    const sw = screen.getByRole("switch", { name: "Hide balances" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    await userEvent.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "true");
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("respects controlled value", async () => {
    render(<Switch label="Notify" checked={false} onCheckedChange={() => {}} />);
    const sw = screen.getByRole("switch");
    await userEvent.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "false");
  });
});
