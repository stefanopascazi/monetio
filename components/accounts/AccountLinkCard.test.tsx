import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccountLinkCard } from "./AccountLinkCard";

const base = { href: "/conti/a", name: "Contanti", type: "cash" as const, balanceCents: 500, members: ["Ste"] };

describe("AccountLinkCard", () => {
  it("links the statement with a maskable, type-coloured card", () => {
    render(<AccountLinkCard {...base} />);
    const link = screen.getByRole("link", { name: /Contanti/ });
    expect(link).toHaveAttribute("href", "/conti/a");
    expect(link).not.toHaveAttribute("aria-current");
    expect(link.querySelector(".mio-account--cash.mio-balances")).not.toBeNull();
  });

  it("marks the current account", () => {
    render(<AccountLinkCard {...base} current />);
    const link = screen.getByRole("link", { name: /Contanti/ });
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link.querySelector(".mio-account")).toHaveClass("is-selected");
  });

  it("shows the month-end note only when known", () => {
    const { rerender } = render(<AccountLinkCard {...base} />);
    expect(screen.queryByText("Rimanenza a fine mese")).toBeNull();
    rerender(<AccountLinkCard {...base} monthEndCents={-100} />);
    expect(screen.getByText("Rimanenza a fine mese")).toBeInTheDocument();
  });
});
