import { Tag, Zap } from "lucide-react";
import { describe, expect, it } from "vitest";
import { categoryIcon } from "./CategoryIcon";

describe("categoryIcon", () => {
  it("maps known names and falls back to a tag", () => {
    expect(categoryIcon("zap")).toBe(Zap);
    expect(categoryIcon("unknown")).toBe(Tag);
    expect(categoryIcon(null)).toBe(Tag);
  });
});
