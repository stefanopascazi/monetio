import { describe, expect, it } from "vitest";
import { isDrag, pageStep, scrollEdges } from "./carousel";

describe("scrollEdges", () => {
  it("detects start, middle and end", () => {
    expect(scrollEdges({ scrollLeft: 0, scrollWidth: 1000, clientWidth: 400 })).toEqual({ atStart: true, atEnd: false });
    expect(scrollEdges({ scrollLeft: 300, scrollWidth: 1000, clientWidth: 400 })).toEqual({ atStart: false, atEnd: false });
    expect(scrollEdges({ scrollLeft: 599.5, scrollWidth: 1000, clientWidth: 400 })).toEqual({ atStart: false, atEnd: true });
  });
  it("is at both edges when everything fits", () => {
    expect(scrollEdges({ scrollLeft: 0, scrollWidth: 400, clientWidth: 400 })).toEqual({ atStart: true, atEnd: true });
  });
});

describe("pageStep", () => {
  it("scrolls most of the visible width", () => {
    expect(pageStep(1000)).toBe(850);
  });
  it("never returns zero", () => {
    expect(pageStep(0)).toBe(1);
  });
});

describe("isDrag", () => {
  it("needs more than the threshold in either direction", () => {
    expect(isDrag(5)).toBe(false);
    expect(isDrag(-6)).toBe(true);
  });
});
