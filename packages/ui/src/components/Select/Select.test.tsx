import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Select } from "./Select";

const options = [
  { value: "joint", label: "Joint account" },
  { value: "card", label: "Credit card" },
];

describe("Select", () => {
  it("renders options with a placeholder", () => {
    render(<Select label="Account" options={options} placeholder="Choose account" defaultValue="" />);
    expect(screen.getByLabelText("Account")).toHaveValue("");
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("emits change", async () => {
    const onChange = vi.fn();
    render(<Select label="Account" options={options} onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText("Account"), "card");
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByLabelText("Account")).toHaveValue("card");
  });
});
