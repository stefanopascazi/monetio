import { describe, expect, it } from "vitest";
import { parseCategoryForm } from "./category";

const form = (data: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.set(k, v);
  return fd;
};

describe("parseCategoryForm", () => {
  it("parses a complete category", () => {
    const res = parseCategoryForm(form({ name: " Vacanze ", kind: "both", icon: "car", colorIndex: "4" }));
    expect(res).toEqual({ ok: true, value: { name: "Vacanze", kind: "both", icon: "car", colorIndex: 4 } });
  });

  it("defaults kind, color and empty icon", () => {
    const res = parseCategoryForm(form({ name: "Varie" }));
    expect(res).toEqual({ ok: true, value: { name: "Varie", kind: "expense", icon: null, colorIndex: 1 } });
  });

  it("rejects missing name, unknown kind and out-of-range color", () => {
    const res = parseCategoryForm(form({ kind: "other", colorIndex: "9" }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(Object.keys(res.errors).sort()).toEqual(["colorIndex", "kind", "name"]);
  });
});
