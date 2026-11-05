import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Stack } from "./Stack";

describe("Stack", () => {
  it("maps gap to a spacing token", () => {
    const { container } = render(<Stack direction="row" gap={3} wrap />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.gap).toBe("var(--mio-space-3)");
    expect(el.style.flexDirection).toBe("row");
    expect(el.style.flexWrap).toBe("wrap");
  });

  it("renders a custom element", () => {
    const { container } = render(<Stack as="ul" />);
    expect(container.firstChild?.nodeName).toBe("UL");
  });
});
