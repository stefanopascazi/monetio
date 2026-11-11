import { fireEvent, render, screen } from "@testing-library/react";
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

});

// jsdom has no PointerEvent: without it fireEvent drops clientY.
if (!("PointerEvent" in window)) Object.assign(window, { PointerEvent: MouseEvent });

describe("BottomNav more panel", () => {
  const more = [
    { id: "data", label: "Data", icon: <svg /> },
    { id: "settings", label: "Settings", icon: <svg /> },
  ];
  const nav = () => screen.getByRole("navigation");
  const handle = () => screen.getByRole("button", { name: /more sections/ });

  it("has no handle without secondary items", () => {
    render(<BottomNav items={items} activeId="home" />);
    expect(screen.queryByRole("button", { name: /more sections/ })).not.toBeInTheDocument();
  });

  it("toggles the panel with a tap or the keyboard", async () => {
    render(<BottomNav items={items} moreItems={more} activeId="home" />);
    expect(handle()).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(handle());
    expect(handle()).toHaveAttribute("aria-expanded", "true");
    expect(nav()).toHaveClass("is-open");
    handle().focus();
    await userEvent.keyboard("{Enter}");
    expect(handle()).toHaveAttribute("aria-expanded", "false");
  });

  it("opens on a drag up and closes on a drag down, ignoring short moves", () => {
    render(<BottomNav items={items} moreItems={more} activeId="home" />);
    const drag = (from: number, to: number) => {
      fireEvent.pointerDown(handle(), { clientY: from });
      fireEvent.pointerUp(handle(), { clientY: to });
      fireEvent.click(handle());
    };
    drag(500, 450);
    expect(handle()).toHaveAttribute("aria-expanded", "true");
    drag(450, 500);
    expect(handle()).toHaveAttribute("aria-expanded", "false");
    // A short move is a tap: it toggles.
    drag(500, 495);
    expect(handle()).toHaveAttribute("aria-expanded", "true");
  });

  it("closes on Escape, outside press and after choosing a section", async () => {
    const onSelect = vi.fn();
    render(
      <>
        <p>outside</p>
        <BottomNav items={items} moreItems={more} activeId="home" onSelect={onSelect} />
      </>,
    );
    await userEvent.click(handle());
    await userEvent.keyboard("{Escape}");
    expect(handle()).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(handle());
    await userEvent.click(screen.getByText("outside"));
    expect(handle()).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(handle());
    await userEvent.click(screen.getByRole("button", { name: "Data" }));
    expect(onSelect).toHaveBeenCalledWith("data");
    expect(handle()).toHaveAttribute("aria-expanded", "false");
  });

  it("offers a rail entry that opens the same panel and reflects a secondary active page", async () => {
    const { rerender } = render(<BottomNav items={items} moreItems={more} activeId="home" />);
    const entry = screen.getByRole("button", { name: "More" });
    expect(entry.closest("li")).toHaveClass("mio-nav__more-entry");
    await userEvent.click(entry);
    expect(entry).toHaveAttribute("aria-expanded", "true");
    expect(entry).toHaveClass("is-expanded");
    expect(entry).not.toHaveClass("is-active");
    await userEvent.click(entry);
    expect(entry).toHaveAttribute("aria-expanded", "false");
    expect(entry).not.toHaveClass("is-expanded");
    rerender(<BottomNav items={items} moreItems={more} activeId="data" />);
    expect(screen.getByRole("button", { name: "More" })).toHaveClass("is-active");
  });

  it("closes when the active page changes and flags a secondary active page on the handle", async () => {
    const { rerender } = render(<BottomNav items={items} moreItems={more} activeId="home" />);
    await userEvent.click(handle());
    rerender(<BottomNav items={items} moreItems={more} activeId="data" />);
    expect(handle()).toHaveAttribute("aria-expanded", "false");
    expect(handle()).toHaveClass("is-active");
    expect(screen.getByRole("button", { name: "Data" })).toHaveAttribute("aria-current", "page");
  });
});
