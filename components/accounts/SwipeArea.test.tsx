import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SwipeArea } from "./SwipeArea";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const swipe = (fromX: number, toX: number, dy = 0) => {
  const area = screen.getByTestId("swipe-area");
  fireEvent.touchStart(area, { touches: [{ clientX: fromX, clientY: 100 }] });
  fireEvent.touchEnd(area, { changedTouches: [{ clientX: toX, clientY: 100 + dy }] });
};

describe("SwipeArea", () => {
  beforeEach(() => push.mockClear());

  it("opens the next account on a left swipe and the previous on a right swipe", () => {
    render(<SwipeArea prevHref="/conti/a" nextHref="/conti/c">header</SwipeArea>);
    swipe(300, 150);
    expect(push).toHaveBeenLastCalledWith("/conti/c", { scroll: false });
    swipe(100, 250);
    expect(push).toHaveBeenLastCalledWith("/conti/a", { scroll: false });
  });

  it("ignores vertical gestures and missing neighbours", () => {
    render(<SwipeArea nextHref={null}>header</SwipeArea>);
    swipe(300, 150);
    swipe(300, 220, 200);
    expect(push).not.toHaveBeenCalled();
  });
});
