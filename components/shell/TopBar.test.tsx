import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TopBar } from "./TopBar";

describe("TopBar", () => {
  it("links the personal icon to settings", () => {
    render(<TopBar />);
    expect(screen.getByRole("link", { name: "Profilo e impostazioni" })).toHaveAttribute("href", "/impostazioni");
  });
});
