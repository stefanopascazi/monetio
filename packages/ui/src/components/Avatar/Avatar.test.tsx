import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar, AvatarGroup, avatarTint } from "./Avatar";

describe("Avatar", () => {
  it("renders initials", () => {
    render(<Avatar name="Giulia Rossi" />);
    expect(screen.getByRole("img", { name: "Giulia Rossi" })).toHaveTextContent("GR");
  });

  it("produces a stable tint", () => {
    expect(avatarTint("Marco")).toBe(avatarTint("Marco"));
  });

  it("collapses extra members in a group", () => {
    render(<AvatarGroup names={["Giulia", "Marco", "Sofia", "Luca"]} max={2} />);
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.getByRole("group")).toHaveAttribute("aria-label", "Shared with Giulia, Marco, Sofia, Luca");
  });
});
