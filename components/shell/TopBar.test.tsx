import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TopBar } from "./TopBar";
import { TOPBAR_SLOT_ID } from "./topbar-ids";

describe("TopBar", () => {
  it("links the personal icon to settings", () => {
    render(<TopBar />);
    expect(screen.getByRole("link", { name: "Profilo e impostazioni" })).toHaveAttribute("href", "/impostazioni");
  });

  it("is sticky with the privacy toggle and the actions slot, without theme switch", () => {
    const { container } = render(<TopBar />);
    expect(screen.getByRole("banner")).toHaveClass("sticky");
    expect(screen.getByRole("button", { name: "Nascondi saldi" })).toBeInTheDocument();
    expect(container.querySelector(`#${TOPBAR_SLOT_ID}`)).not.toBeNull();
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });
});
