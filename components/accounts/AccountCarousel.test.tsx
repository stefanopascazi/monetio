import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { AccountCarousel, type CarouselAccount } from "./AccountCarousel";

const nav = vi.hoisted(() => ({ params: {} as { id?: string }, search: new URLSearchParams() }));
vi.mock("next/navigation", () => ({ useParams: () => nav.params, useSearchParams: () => nav.search }));

// jsdom has no PointerEvent: a MouseEvent carrying pointerType is enough for the drag hook.
if (typeof window.PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerType = init.pointerType ?? "";
    }
  }
  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}

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
      <AccountCarousel accounts={accounts} />
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

  it("keeps the period in the card links", () => {
    renderCarousel();
    expect(screen.getByRole("link", { name: /Contanti/ })).toHaveAttribute("href", "/conti/b?mese=2026-10");
  });

  it("pages the row with the arrows instead of changing account", async () => {
    renderCarousel();
    const row = screen.getByRole("list");
    Object.defineProperty(row, "clientWidth", { value: 1000, configurable: true });
    Object.defineProperty(row, "scrollWidth", { value: 3000, configurable: true });
    const scrollBy = vi.fn();
    row.scrollBy = scrollBy;
    fireEvent.scroll(row);
    const forward = screen.getByRole("button", { name: "Scorri avanti" });
    expect(screen.getByRole("button", { name: "Scorri indietro" })).toBeDisabled();
    expect(forward).toBeEnabled();
    await userEvent.click(forward);
    expect(scrollBy).toHaveBeenCalledWith({ left: 850, behavior: "smooth" });
    expect(screen.queryByRole("link", { name: /Conto (successivo|precedente)/ })).toBeNull();
  });

  it("swallows the click that ends a mouse drag", () => {
    renderCarousel();
    const row = screen.getByRole("list");
    const link = screen.getByRole("link", { name: /Contanti/ });
    fireEvent.pointerDown(row, { pointerType: "mouse", button: 0, clientX: 300 });
    fireEvent.pointerMove(window, { pointerType: "mouse", clientX: 200 });
    expect(row).toHaveAttribute("data-dragging", "true");
    fireEvent.pointerUp(window, { pointerType: "mouse" });
    expect(row).not.toHaveAttribute("data-dragging");
    expect(fireEvent.click(link)).toBe(false);
    // A plain click afterwards still navigates: record whether the app prevented it, then stop
    // jsdom's own navigation (not implemented, it logs an error after the test).
    let prevented: boolean | undefined;
    const stopJsdomNavigation = (e: MouseEvent) => {
      prevented = e.defaultPrevented;
      e.preventDefault();
    };
    window.addEventListener("click", stopJsdomNavigation);
    fireEvent.pointerDown(row, { pointerType: "mouse", button: 0, clientX: 300 });
    fireEvent.pointerUp(window, { pointerType: "mouse" });
    fireEvent.click(link);
    window.removeEventListener("click", stopJsdomNavigation);
    expect(prevented).toBe(false);
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

});
