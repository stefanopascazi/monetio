import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { DetailViews } from "./DetailViews";
import { VIEW_MODE_STORAGE_KEY } from "./grid/view-mode";

const details = [
  {
    month: "2026-11",
    byAccount: {
      a: { openingCents: 1000, closingCents: 800, items: [{ label: "Mutuo", source: "rule" as const, amountCents: -200, count: 1, overdue: false, categoryId: "home" }] },
    },
  },
];
const props = { listDetails: details, gridPeriods: details, accounts: [{ id: "a", name: "Conto A" }], categoryNames: { home: "Casa" }, currentMonth: "2026-11" };

describe("DetailViews", () => {
  beforeEach(() => localStorage.clear());

  it("shows the list by default", () => {
    render(<DetailViews {...props} />);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("radio", { name: "Elenco" })).toBeChecked();
  });

  it("switches to the grid on desktop, keeps the list for phones and remembers the choice", async () => {
    render(<DetailViews {...props} />);
    await userEvent.click(screen.getByRole("radio", { name: "Griglia" }));
    const table = screen.getByRole("table");
    expect(table.closest('[class~="lg:block"]')).toHaveClass("hidden");
    expect(screen.getByText("Fine mese").closest('[class~="lg:hidden"]')).not.toBeNull();
    expect(localStorage.getItem(VIEW_MODE_STORAGE_KEY)).toBe("grid");
    // Rows inside income/expense stay folded until clicked.
    expect(within(table).queryByText("Casa")).toBeNull();
    await userEvent.click(within(table).getByRole("button", { name: "Uscite" }));
    expect(within(table).getByText("Casa")).toBeInTheDocument();
    expect(within(table).queryByText("Mutuo")).toBeNull();
  });
});
