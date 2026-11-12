import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BellLink } from "./BellLink";

describe("BellLink", () => {
  it("links to the notifications page without a badge at zero", () => {
    const { container } = render(<BellLink unread={0} />);
    expect(screen.getByRole("link", { name: "Notifiche" })).toHaveAttribute("href", "/notifiche");
    expect(container.querySelector("span[aria-hidden='true'].bg-accent")).toBeNull();
  });

  it("shows and announces the unread count", () => {
    render(<BellLink unread={3} />);
    const link = screen.getByRole("link", { name: "Notifiche, 3 da leggere" });
    expect(link).toHaveTextContent("3");
  });
});
