import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { AccountSwitcher } from "./AccountSwitcher";

vi.mock("@/app/actions/accounts", () => ({ createAccount: vi.fn(async () => ({ ok: true, message: "ok" })) }));

const items = [
  { id: "a", name: "Cointestato", balanceCents: 1000, href: "/conti/a?mese=2026-10" },
  { id: "b", name: "Contanti", balanceCents: 200, href: "/conti/b?mese=2026-10" },
];

const renderSwitcher = (props: Partial<Parameters<typeof AccountSwitcher>[0]> = {}) =>
  render(
    <ToastProvider>
      <AccountSwitcher items={items} currentId="a" nextHref="/conti/b?mese=2026-10" today="2026-11-09" {...props} />
    </ToastProvider>,
  );

describe("AccountSwitcher", () => {
  it("links every account and marks the current one", () => {
    renderSwitcher();
    const current = screen.getByRole("link", { name: /Cointestato/ });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveClass("is-selected");
    expect(screen.getByRole("link", { name: /Contanti/ })).toHaveAttribute("href", "/conti/b?mese=2026-10");
  });

  it("renders prev/next arrows only when a neighbour exists", () => {
    renderSwitcher();
    expect(screen.getByRole("link", { name: "Conto successivo" })).toHaveAttribute("href", "/conti/b?mese=2026-10");
    expect(screen.queryByRole("link", { name: "Conto precedente" })).toBeNull();
  });

  it("marks balances as maskable in privacy mode", () => {
    renderSwitcher();
    expect(screen.getByRole("link", { name: /Contanti/ }).closest(".mio-balances")).not.toBeNull();
  });

  it("opens and closes the new account form inline", async () => {
    renderSwitcher();
    expect(screen.queryByRole("button", { name: "Crea conto" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Nuovo" }));
    expect(screen.getByRole("button", { name: "Crea conto" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Nuovo" }));
    expect(screen.queryByRole("button", { name: "Crea conto" })).toBeNull();
  });
});
