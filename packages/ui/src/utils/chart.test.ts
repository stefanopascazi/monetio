import { describe, expect, it } from "vitest";
import { arcPath, bandPath, barPath, linePath, linearScale, niceTicks } from "./chart";
import { cx } from "./cx";

describe("linearScale", () => {
  it("maps and inverts ranges", () => {
    const s = linearScale([0, 100], [200, 0]);
    expect(s(0)).toBe(200);
    expect(s(50)).toBe(100);
  });

  it("handles a zero-width domain", () => {
    expect(linearScale([5, 5], [0, 10])(5)).toBe(0);
  });
});

describe("niceTicks", () => {
  it("returns rounded ticks covering the range", () => {
    expect(niceTicks(0, 450000, 4)).toEqual([0, 200000, 400000, 600000]);
    expect(niceTicks(0, 450000, 5)).toEqual([0, 100000, 200000, 300000, 400000, 500000]);
    expect(niceTicks(0, 9, 4)).toEqual([0, 2.5, 5, 7.5, 10]);
  });

  it("returns single value for flat data", () => {
    expect(niceTicks(3, 3)).toEqual([3]);
  });
});

describe("paths", () => {
  it("builds a bar with rounded top and empty for zero height", () => {
    expect(barPath(0, 0, 10, 20)).toMatch(/^M0,20V4Q0,0 4,0H6Q10,0 10,4V20Z$/);
    expect(barPath(0, 0, 10, 0)).toBe("");
  });

  it("builds lines and bands", () => {
    expect(linePath([[0, 0], [10, 5]])).toBe("M0,0L10,5");
    expect(bandPath([[0, 0], [10, 0]], [[0, 5], [10, 5]])).toBe("M0,0L10,0L10,5L0,5Z");
    expect(bandPath([], [])).toBe("");
  });

  it("builds a donut arc", () => {
    const d = arcPath(50, 50, 50, 30, 0, Math.PI / 2);
    expect(d.startsWith("M50,0A50,50 0 0 1 100,50")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
  });
});

describe("cx", () => {
  it("joins truthy classes", () => {
    expect(cx("a", false, null, undefined, 0, "b")).toBe("a b");
  });
});
