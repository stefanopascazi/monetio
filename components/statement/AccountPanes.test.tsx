import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AccountPanes } from "./AccountPanes";

const renderPanes = () => render(<AccountPanes statement={<p>Estratto</p>} side={<p>Riepilogo mese</p>} />);

describe("AccountPanes", () => {
  it("shows movements first on phones and hides the switch on wide layouts", () => {
    renderPanes();
    expect(screen.getByTestId("account-pane-switch")).toHaveClass("lg:hidden");
    expect(screen.getByRole("radio", { name: "Movimenti" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("account-statement")).not.toHaveClass("max-lg:hidden");
    expect(screen.getByTestId("account-side")).toHaveClass("max-lg:hidden");
  });

  it("switches to the accessory cards and back", async () => {
    renderPanes();
    await userEvent.click(screen.getByRole("radio", { name: "Riepilogo" }));
    expect(screen.getByTestId("account-side")).not.toHaveClass("max-lg:hidden");
    expect(screen.getByTestId("account-statement")).toHaveClass("max-lg:hidden");
    await userEvent.click(screen.getByRole("radio", { name: "Movimenti" }));
    expect(screen.getByTestId("account-statement")).not.toHaveClass("max-lg:hidden");
  });

  it("renders both panes so wide layouts show them side by side", () => {
    renderPanes();
    expect(screen.getByText("Estratto")).toBeInTheDocument();
    expect(screen.getByText("Riepilogo mese")).toBeInTheDocument();
  });
});
