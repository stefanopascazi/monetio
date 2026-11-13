import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FiltersFold, FiltersPanel, FiltersToggle } from "./FiltersFold";

const renderFold = (defaultOpen?: boolean) =>
  render(
    <FiltersFold defaultOpen={defaultOpen}>
      <FiltersToggle />
      <FiltersPanel>
        <p>Filtri</p>
      </FiltersPanel>
    </FiltersFold>,
  );

const panel = () => screen.getByText("Filtri").parentElement!;

describe("FiltersFold", () => {
  it("starts folded on phones only, with the icon hidden on wide layouts", () => {
    renderFold();
    const toggle = screen.getByRole("button", { name: "Mostra filtri" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveClass("lg:hidden");
    expect(toggle).toHaveAttribute("aria-controls", panel().id);
    expect(panel()).toHaveClass("max-lg:hidden");
  });

  it("opens and closes the panel from the icon", async () => {
    renderFold();
    await userEvent.click(screen.getByRole("button", { name: "Mostra filtri" }));
    expect(panel()).not.toHaveClass("max-lg:hidden");
    await userEvent.click(screen.getByRole("button", { name: "Nascondi filtri" }));
    expect(panel()).toHaveClass("max-lg:hidden");
  });

  it("can start open", () => {
    renderFold(true);
    expect(screen.getByRole("button", { name: "Nascondi filtri" })).toHaveAttribute("aria-expanded", "true");
    expect(panel()).not.toHaveClass("max-lg:hidden");
  });

  it("throws when a part is used outside the fold", () => {
    expect(() => render(<FiltersToggle />)).toThrow(/inside <FiltersFold>/);
  });
});
