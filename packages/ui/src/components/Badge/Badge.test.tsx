import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("applies tone and size classes", () => {
    render(<Badge tone="warning" size="sm">Due soon</Badge>);
    expect(screen.getByText("Due soon")).toHaveClass("mio-badge--warning", "mio-badge--sm");
  });

  it("defaults to neutral", () => {
    render(<Badge>Draft</Badge>);
    expect(screen.getByText("Draft")).toHaveClass("mio-badge--neutral");
  });
});
