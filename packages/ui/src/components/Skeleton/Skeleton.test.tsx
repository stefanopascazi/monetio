import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("renders a single block with size", () => {
    const { container } = render(<Skeleton width={120} height={20} radius="pill" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass("mio-skeleton--pill");
    expect(el.style.width).toBe("120px");
  });

  it("renders multiple lines with a shorter last one", () => {
    const { container } = render(<Skeleton lines={3} />);
    const lines = container.querySelectorAll(".mio-skeleton");
    expect(lines).toHaveLength(3);
    expect((lines[2] as HTMLElement).style.width).toBe("60%");
  });
});
