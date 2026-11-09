import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { AccountCarousel, type CarouselAccount } from "./AccountCarousel";

const nav = vi.hoisted(() => ({ params: {} as { id?: string }, search: new URLSearchParams() }));
vi.mock("next/navigation", () => ({ useParams: () => nav.params, useSearchParams: () => nav.search }));
vi.mock("@/app/actions/accounts", () => ({ createAccount: vi.fn(async () => ({ ok: true, message: "ok" })) }));

const account = (id: string, name: string, extra: Partial<CarouselAccount> = {}): CarouselAccount => ({
  id,
  name,
  institution: null,
  type: "checking",
  balanceCents: 1000,
  members: ["Ste", "Asha"],
  archived: false,
  ...extra,
});
const accounts = [account("a", "Cointestato", { monthEndCents: 800 }), account("b", "Contanti", { type: "cash" }), account("z", "Vecchio", { archived: true })];

const renderCarousel = () =>
  render(
    <ToastProvider>
      <AccountCarousel accounts={accounts} today="2026-11-09" />
    </ToastProvider>,
  );

describe("AccountCarousel", () => {
  beforeEach(() => {
    nav.params = { id: "a" };
    nav.search = new URLSearchParams("mese=2026-10&n=60");
  });

  it("shows a card per active account and highlights the current one", () => {
    renderCarousel();
    const current = screen.getByRole("link", { name: /Cointestato/ });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current.querySelector(".mio-account")).toHaveClass("is-selected", "mio-account--checking");
    expect(screen.getByRole("link", { name: /Contanti/ }).querySelector(".mio-account--cash")).not.toBeNull();
    expect(screen.queryByRole("link", { name: /Vecchio/ })).toBeNull();
    expect(screen.getByText("Rimanenza a fine mese")).toBeInTheDocument();
  });

  it("keeps the period in links and arrows", () => {
    renderCarousel();
    expect(screen.getByRole("link", { name: /Contanti/ })).toHaveAttribute("href", "/conti/b?mese=2026-10");
    expect(screen.getByRole("link", { name: "Conto successivo" })).toHaveAttribute("href", "/conti/b?mese=2026-10");
    expect(screen.queryByRole("link", { name: "Conto precedente" })).toBeNull();
  });

  it("includes the current account when archived", () => {
    nav.params = { id: "z" };
    renderCarousel();
    expect(screen.getByRole("link", { name: /Vecchio/ })).toHaveAttribute("aria-current", "page");
  });

  it("highlights nothing on the landing route", () => {
    nav.params = {};
    renderCarousel();
    expect(screen.queryByRole("link", { current: "page" })).toBeNull();
  });

  it("toggles the new account form inline", async () => {
    renderCarousel();
    await userEvent.click(screen.getByRole("button", { name: "Nuovo conto" }));
    expect(screen.getByRole("button", { name: "Crea conto" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Nuovo conto" }));
    expect(screen.queryByRole("button", { name: "Crea conto" })).toBeNull();
  });
});
