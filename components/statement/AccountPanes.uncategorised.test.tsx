import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AccountPanes } from "./AccountPanes";

const renderPanes = () => render(<AccountPanes statement={<p>Estratto</p>} side={<p>Riepilogo mese</p>} uncategorised={<p>Gruppi</p>} />);

describe("AccountPanes with Da categorizzare", () => {
  it("starts on movements with the tab hidden", () => {
    renderPanes();
    expect(screen.getByTestId("account-uncategorised")).toHaveClass("hidden");
    expect(screen.getByTestId("account-statement")).not.toHaveClass("hidden");
  });

  it("switches the main column on phones and wide layouts", async () => {
    renderPanes();
    await userEvent.click(within(screen.getByTestId("account-pane-switch")).getByRole("radio", { name: "Da categorizzare" }));
    expect(screen.getByTestId("account-uncategorised")).not.toHaveClass("hidden");
    expect(screen.getByTestId("account-statement")).toHaveClass("hidden");
    await userEvent.click(within(screen.getByTestId("account-main-switch")).getByRole("radio", { name: "Movimenti" }));
    expect(screen.getByTestId("account-statement")).not.toHaveClass("hidden");
    expect(screen.getByTestId("account-uncategorised")).toHaveClass("hidden");
  });
});
