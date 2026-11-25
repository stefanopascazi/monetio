import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRefreshOnResume } from "./useRefreshOnResume";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

function setVisibility(state: "hidden" | "visible") {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
  document.dispatchEvent(new Event("visibilitychange"));
}

afterEach(() => {
  refresh.mockClear();
  vi.useRealTimers();
});

describe("useRefreshOnResume", () => {
  it("refreshes after a long pause, not after a short one", () => {
    vi.useFakeTimers();
    renderHook(() => useRefreshOnResume(1000));
    setVisibility("hidden");
    vi.advanceTimersByTime(500);
    setVisibility("visible");
    expect(refresh).not.toHaveBeenCalled();
    setVisibility("hidden");
    vi.advanceTimersByTime(1000);
    setVisibility("visible");
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
