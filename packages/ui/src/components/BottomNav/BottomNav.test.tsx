import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BottomNav } from "./BottomNav";

const items = [
  { id: "home", label: "Home", icon: <svg /> },
  { id: "due", label: "Due", icon: <svg />, badge: 2 },
];

describe("BottomNav", () => {
  it("marks the active item as current page", () => {
    render(<BottomNav items={items} activeId="home" />);
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: /Due/ })).not.toHaveAttribute("aria-current");
  });

  it("calls onSelect for button items", async () => {
    const onSelect = vi.fn();
    render(<BottomNav items={items} activeId="home" onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: /Due/ }));
    expect(onSelect).toHaveBeenCalledWith("due");
  });

  it("renders links with a custom link component", () => {
    const Link = vi.fn((p: { href: string; children: React.ReactNode }) => <a href={p.href}>{p.children}</a>);
    render(<BottomNav items={[{ id: "a", label: "Accounts", icon: <svg />, href: "/accounts" }]} activeId="a" linkAs={Link} />);
    expect(screen.getByRole("link", { name: "Accounts" })).toHaveAttribute("href", "/accounts");
    expect(Link).toHaveBeenCalled();
  });

  it("marks rail-only items for the desktop rail", () => {
    render(<BottomNav items={[...items, { id: "data", label: "Data", icon: <svg />, railOnly: true }]} activeId="home" />);
    expect(screen.getByRole("button", { name: "Data" }).closest("li")).toHaveClass("mio-nav__rail-only");
    expect(screen.getByRole("button", { name: "Home" }).closest("li")).not.toHaveClass("mio-nav__rail-only");
  });
});
