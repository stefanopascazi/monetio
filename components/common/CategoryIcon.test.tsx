import { Tag, Zap } from "lucide-react";
import { describe, expect, it } from "vitest";
import { CATEGORY_ICON_NAMES, categoryIcon, categoryIconLabel, categoryTint } from "./CategoryIcon";

describe("categoryIcon", () => {
  it("maps known names and falls back to a tag", () => {
    expect(categoryIcon("zap")).toBe(Zap);
    expect(categoryIcon("unknown")).toBe(Tag);
    expect(categoryIcon(null)).toBe(Tag);
  });
});

describe("categoryIconLabel", () => {
  it("gives an Italian label for every icon and falls back to the name", () => {
    for (const n of CATEGORY_ICON_NAMES) expect(categoryIconLabel(n)).not.toBe(n);
    expect(categoryIconLabel("unknown")).toBe("unknown");
  });
});

describe("categoryTint", () => {
  it("uses the chart color as foreground and a soft mix as background", () => {
    expect(categoryTint(3)).toEqual({
      background: "color-mix(in srgb, var(--mio-chart-3) 18%, transparent)",
      color: "var(--mio-chart-3)",
    });
  });
});
