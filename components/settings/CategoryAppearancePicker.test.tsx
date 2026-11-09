import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CATEGORY_ICON_NAMES } from "@/components/common/CategoryIcon";
import { CategoryAppearancePicker } from "./CategoryAppearancePicker";

function formValues(container: HTMLElement) {
  const fd = new FormData(container.querySelector("form")!);
  return { icon: fd.get("icon"), colorIndex: fd.get("colorIndex") };
}

describe("CategoryAppearancePicker", () => {
  it("renders every icon and color as a radio with defaults checked", () => {
    const { container } = render(<form><CategoryAppearancePicker /></form>);
    expect(screen.getAllByRole("radio", { name: /^Colore \d$/ })).toHaveLength(6);
    expect(container.querySelectorAll('input[name="icon"]')).toHaveLength(CATEGORY_ICON_NAMES.length);
    expect(formValues(container)).toEqual({ icon: "sparkles", colorIndex: "1" });
  });

  it("submits the picked icon and color and tints the preview", () => {
    const { container } = render(<form><CategoryAppearancePicker /></form>);
    fireEvent.click(screen.getByRole("radio", { name: "Auto" }));
    fireEvent.click(screen.getByRole("radio", { name: "Colore 4" }));
    expect(formValues(container)).toEqual({ icon: "car", colorIndex: "4" });
    expect(screen.getByTestId("category-preview").style.color).toBe("var(--mio-chart-4)");
  });
});
