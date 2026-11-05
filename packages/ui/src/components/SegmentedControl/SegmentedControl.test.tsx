import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SegmentedControl } from "./SegmentedControl";

const options = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
];

describe("SegmentedControl", () => {
  it("selects the first option by default", () => {
    render(<SegmentedControl aria-label="Type" options={options} />);
    expect(screen.getByRole("radio", { name: "Expense" })).toHaveAttribute("aria-checked", "true");
  });

  it("changes on click and calls onChange", async () => {
    const onChange = vi.fn();
    render(<SegmentedControl aria-label="Type" options={options} onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "Income" }));
    expect(onChange).toHaveBeenCalledWith("income");
    expect(screen.getByRole("radio", { name: "Income" })).toHaveAttribute("aria-checked", "true");
  });

  it("supports arrow keys with wrap-around", async () => {
    render(<SegmentedControl aria-label="Type" options={options} />);
    screen.getByRole("radio", { name: "Expense" }).focus();
    await userEvent.keyboard("{ArrowLeft}");
    const transfer = screen.getByRole("radio", { name: "Transfer" });
    expect(transfer).toHaveAttribute("aria-checked", "true");
    expect(transfer).toHaveFocus();
  });
});
