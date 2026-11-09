import { describe, expect, it } from "vitest";
import { startsInHorizontalScroller, swipeDirection } from "./swipe";

describe("swipeDirection", () => {
  it("maps left swipe to next and right swipe to prev", () => {
    expect(swipeDirection(-80, 5)).toBe("next");
    expect(swipeDirection(80, -5)).toBe("prev");
  });
  it("ignores short swipes", () => {
    expect(swipeDirection(-40, 0)).toBeNull();
  });
  it("ignores mostly vertical gestures", () => {
    expect(swipeDirection(-80, 70)).toBeNull();
  });
});

describe("startsInHorizontalScroller", () => {
  const sized = (el: HTMLElement, scrollWidth: number, clientWidth: number) => {
    Object.defineProperty(el, "scrollWidth", { value: scrollWidth });
    Object.defineProperty(el, "clientWidth", { value: clientWidth });
  };

  it("detects an overflowing horizontal scroller between target and root", () => {
    const root = document.createElement("div");
    const scroller = document.createElement("div");
    scroller.style.overflowX = "auto";
    sized(scroller, 800, 300);
    const cell = document.createElement("span");
    scroller.append(cell);
    root.append(scroller);
    document.body.append(root);
    expect(startsInHorizontalScroller(cell, root)).toBe(true);
  });

  it("ignores non-scrolling or non-overflowing ancestors", () => {
    const root = document.createElement("div");
    const box = document.createElement("div");
    sized(box, 800, 300);
    const fits = document.createElement("div");
    fits.style.overflowX = "auto";
    sized(fits, 300, 300);
    const cell = document.createElement("span");
    fits.append(cell);
    box.append(fits);
    root.append(box);
    document.body.append(root);
    expect(startsInHorizontalScroller(cell, root)).toBe(false);
  });
});
