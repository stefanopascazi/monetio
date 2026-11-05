import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Accordion } from "./Accordion";

const items = [
  { id: "a", title: "Joint account", content: <p>Joint details</p> },
  { id: "b", title: "Savings", content: <p>Savings details</p> },
];

describe("Accordion", () => {
  it("opens items independently in multiple mode", async () => {
    render(<Accordion items={items} />);
    await userEvent.click(screen.getByRole("button", { name: "Joint account" }));
    await userEvent.click(screen.getByRole("button", { name: "Savings" }));
    expect(screen.getByText("Joint details")).toBeVisible();
    expect(screen.getByText("Savings details")).toBeVisible();
  });

  it("keeps one item open in single mode", async () => {
    render(<Accordion items={items} type="single" defaultValue={["a"]} />);
    expect(screen.getByText("Joint details")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Savings" }));
    expect(screen.getByRole("button", { name: "Joint account" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Savings details")).toBeVisible();
  });
});
