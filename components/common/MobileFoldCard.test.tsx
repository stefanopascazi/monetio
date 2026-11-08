import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MobileFoldCard } from "./MobileFoldCard";

const setPhone = (matches: boolean) => vi.stubGlobal("matchMedia", (query: string) => ({ matches, media: query }));

afterEach(() => vi.unstubAllGlobals());

const renderCard = () =>
  render(
    <MobileFoldCard aria-label="Prova" title="Prova">
      <p>Contenuto</p>
    </MobileFoldCard>,
  );

describe("MobileFoldCard", () => {
  it("starts with the phone-fold class and the body rendered", () => {
    renderCard();
    expect(screen.getByRole("region", { name: "Prova" })).toHaveClass("mio-fold-mobile");
    expect(screen.getByText("Contenuto")).toBeVisible();
  });

  it("opens on the first toggle on a phone", () => {
    setPhone(true);
    renderCard();
    fireEvent.click(screen.getByRole("button"));
    const card = screen.getByRole("region", { name: "Prova" });
    expect(card).not.toHaveClass("mio-fold-mobile");
    expect(screen.getByText("Contenuto")).toBeVisible();
  });

  it("folds on the first toggle on wider screens", () => {
    setPhone(false);
    renderCard();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("region", { name: "Prova" })).not.toHaveClass("mio-fold-mobile");
    expect(screen.getByText("Contenuto")).not.toBeVisible();
  });
});
