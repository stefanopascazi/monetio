import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isUnderHeader } from "@/hooks/useHiddenUnderHeader";
import { HeaderAction } from "./HeaderAction";
import { TOPBAR_ID, TOPBAR_SLOT_ID } from "./topbar-ids";

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;
let notify: Callback = () => {};

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: Callback) {
        notify = cb;
      }
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => vi.unstubAllGlobals());

function Page() {
  return (
    <>
      <header id={TOPBAR_ID}>
        <div id={TOPBAR_SLOT_ID} data-testid="slot" />
      </header>
      <div data-testid="title">
        <HeaderAction>
          <button>Gear</button>
        </HeaderAction>
      </div>
    </>
  );
}

describe("HeaderAction", () => {
  it("moves the action into the top bar once scrolled under it, and back", () => {
    render(<Page />);
    expect(screen.getByTestId("title")).toContainElement(screen.getByRole("button", { name: "Gear" }));

    act(() => notify([{ isIntersecting: false, boundingClientRect: { top: -40 } as DOMRect }]));
    expect(screen.getByTestId("slot")).toContainElement(screen.getByRole("button", { name: "Gear" }));

    act(() => notify([{ isIntersecting: true, boundingClientRect: { top: 80 } as DOMRect }]));
    expect(screen.getByTestId("title")).toContainElement(screen.getByRole("button", { name: "Gear" }));
  });
});

describe("isUnderHeader", () => {
  it("ignores elements below the fold", () => {
    expect(isUnderHeader({ isIntersecting: false, boundingClientRect: { top: 900 } as DOMRect }, 64)).toBe(false);
    expect(isUnderHeader({ isIntersecting: false, boundingClientRect: { top: 10 } as DOMRect }, 64)).toBe(true);
    expect(isUnderHeader({ isIntersecting: true, boundingClientRect: { top: 70 } as DOMRect }, 64)).toBe(false);
  });
});
