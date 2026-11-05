import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryDonut, foldSlices, sliceAngles } from "./CategoryDonut";

describe("sliceAngles", () => {
  it("chains angles proportionally around the circle", () => {
    const out = sliceAngles([{ label: "A", valueCents: 1 }, { label: "B", valueCents: 3 }], 4);
    expect(out[0]).toEqual({ a0: 0, a1: Math.PI / 2 });
    expect(out[1].a0).toBe(Math.PI / 2);
    expect(out[1].a1).toBeCloseTo(Math.PI * 2);
  });
});

const data = [
  { label: "Housing", valueCents: 95000 },
  { label: "Groceries", valueCents: 42000 },
  { label: "Transport", valueCents: 18000 },
  { label: "Dining", valueCents: 15000 },
  { label: "Health", valueCents: 9000 },
  { label: "Kids", valueCents: 8000 },
  { label: "Gifts", valueCents: 3000 },
];

describe("foldSlices", () => {
  it("sorts and folds past five into Other", () => {
    const out = foldSlices(data);
    expect(out).toHaveLength(6);
    expect(out[0].label).toBe("Housing");
    expect(out[5]).toEqual({ label: "Other", valueCents: 11000 });
  });

  it("drops zero values", () => {
    expect(foldSlices([{ label: "A", valueCents: 0 }])).toEqual([]);
  });
});

describe("CategoryDonut", () => {
  it("shows total and focuses a slice on legend hover", () => {
    render(<CategoryDonut data={data} />);
    expect(screen.getAllByText("€1,900").length).toBeGreaterThan(0);
    fireEvent.mouseEnter(screen.getAllByText("Groceries")[0].closest("li")!);
    expect(screen.getAllByText("Groceries")).toHaveLength(3);
  });
});
