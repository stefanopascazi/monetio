import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { type Visibility, VisibilityPicker, resolveViewers } from "./VisibilityPicker";

const members = [
  { id: "g", name: "Giulia" },
  { id: "m", name: "Marco" },
  { id: "s", name: "Sofia" },
];

function Harness() {
  const [v, setV] = useState<Visibility>({ mode: "private", memberIds: [] });
  return <VisibilityPicker members={members} ownerId="g" value={v} onChange={setV} />;
}

describe("resolveViewers", () => {
  it("resolves each mode", () => {
    expect(resolveViewers({ mode: "private", memberIds: ["m"] }, members, "g")).toEqual(["g"]);
    expect(resolveViewers({ mode: "household", memberIds: [] }, members, "g")).toEqual(["g", "m", "s"]);
    expect(resolveViewers({ mode: "custom", memberIds: ["m", "g"] }, members, "g")).toEqual(["g", "m"]);
  });
});

describe("VisibilityPicker", () => {
  it("switches to custom and toggles members", async () => {
    render(<Harness />);
    expect(screen.getByText("Only you")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "Choose" }));
    await userEvent.click(screen.getByRole("button", { name: /Marco/ }));
    expect(screen.getByText("You and 1 other")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Giulia/ })).toBeNull();
  });
});
