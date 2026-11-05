import { act, render, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useControllableState } from "./useControllableState";
import { useElementWidth } from "./useElementWidth";

describe("useControllableState", () => {
  it("manages internal state when uncontrolled", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState<number | undefined>(undefined, 1, onChange));
    act(() => result.current[1](2));
    expect(result.current[0]).toBe(2);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("follows the external value when controlled", () => {
    const { result } = renderHook(() => useControllableState(5, 1));
    act(() => result.current[1](9));
    expect(result.current[0]).toBe(5);
  });
});

describe("useElementWidth", () => {
  it("returns the fallback until measured", () => {
    let width = 0;
    function Probe() {
      const [ref, w] = useElementWidth<HTMLDivElement>(320);
      width = w;
      return <div ref={ref} />;
    }
    render(<Probe />);
    expect(width).toBe(320);
  });

  it("updates from ResizeObserver", () => {
    let cb: ResizeObserverCallback = () => {};
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(fn: ResizeObserverCallback) {
          cb = fn;
        }
        observe() {}
        disconnect() {}
      },
    );
    let width = 0;
    function Probe() {
      const [ref, w] = useElementWidth<HTMLDivElement>();
      width = w;
      return <div ref={ref} />;
    }
    render(<Probe />);
    act(() => cb([{ contentRect: { width: 480 } } as ResizeObserverEntry], {} as ResizeObserver));
    expect(width).toBe(480);
    vi.unstubAllGlobals();
  });
});
