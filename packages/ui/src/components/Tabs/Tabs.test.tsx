import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tabs } from "./Tabs";

const tabs = [
  { id: "list", label: "Transactions", count: 42, content: <p>List view</p> },
  { id: "add", label: "Add new", content: <p>Form view</p> },
  { id: "import", label: "Import", content: <p>Import view</p> },
];

describe("Tabs", () => {
  it("shows the first panel by default", () => {
    render(<Tabs aria-label="Transactions" tabs={tabs} />);
    expect(screen.getByText("List view")).toBeVisible();
    expect(screen.queryByText("Form view")).not.toBeVisible();
  });

  it("switches panels on click", async () => {
    render(<Tabs aria-label="Transactions" tabs={tabs} />);
    await userEvent.click(screen.getByRole("tab", { name: "Add new" }));
    expect(screen.getByText("Form view")).toBeVisible();
  });

  it("navigates with arrow, Home and End keys", async () => {
    render(<Tabs aria-label="Transactions" tabs={tabs} />);
    screen.getByRole("tab", { name: /Transactions/ }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Add new" })).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Import" })).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: /Transactions/ })).toHaveAttribute("aria-selected", "true");
  });
});
