import { describe, expect, it } from "vitest";
import { swipeDirection } from "./swipe";

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
