import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SearchSelect } from "./SearchSelect";

const options = [
  { value: "intesa", label: "Intesa Sanpaolo" },
  { value: "credit", label: "Crédit Agricole" },
  { value: "revolut", label: "Revolut" },
];

const trigger = () => screen.getByRole("button", { name: "Bank" });

describe("SearchSelect", () => {
  it("shows the chosen label and opens with a focused search box", async () => {
    render(<SearchSelect label="Bank" options={options} defaultValue="revolut" />);
    expect(trigger()).toHaveTextContent("Revolut");
    expect(screen.queryByRole("listbox")).toBeNull();
    await userEvent.click(trigger());
    expect(screen.getByRole("combobox", { name: "Search" })).toHaveFocus();
    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(screen.getByRole("option", { name: "Revolut" })).toHaveAttribute("aria-selected", "true");
  });

  it("filters ignoring case and accents, and picks with a click", async () => {
    const onChange = vi.fn();
    render(<SearchSelect label="Bank" options={options} onChange={onChange} placeholder="Choose" />);
    expect(trigger()).toHaveTextContent("Choose");
    await userEvent.click(trigger());
    await userEvent.type(screen.getByRole("combobox"), "CREDIT");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Crédit Agricole"]);
    await userEvent.click(screen.getByRole("option", { name: "Crédit Agricole" }));
    expect(onChange).toHaveBeenCalledWith("credit");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(trigger()).toHaveTextContent("Crédit Agricole");
    expect(trigger()).toHaveFocus();
  });

  it("moves with arrows and picks with Enter", async () => {
    const onChange = vi.fn();
    render(<SearchSelect label="Bank" options={options} value="intesa" onChange={onChange} />);
    await userEvent.click(trigger());
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenCalledWith("revolut");
  });

  it("explains an empty result and closes with Escape", async () => {
    render(<SearchSelect label="Bank" options={options} />);
    await userEvent.click(trigger());
    await userEvent.type(screen.getByRole("combobox"), "zzz");
    expect(screen.getByText("No results")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByText("No results")).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it("closes on a click outside", async () => {
    render(
      <>
        <SearchSelect label="Bank" options={options} />
        <p>outside</p>
      </>,
    );
    await userEvent.click(trigger());
    await userEvent.click(screen.getByText("outside"));
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
