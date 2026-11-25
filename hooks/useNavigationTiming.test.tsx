import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readNavLog, resetNavLogCache } from "@/lib/perf/nav-log";
import { NAV_TIMEOUT_MS, useNavigationTiming } from "./useNavigationTiming";

let pathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
}));

function tapLink(href: string) {
  document.body.innerHTML = `<a href="${href}">x</a>`;
  const a = document.body.querySelector("a")!;
  // Keeps jsdom from following the link (bubble phase, after the capture listener).
  a.addEventListener("click", (e) => e.preventDefault());
  act(() => {
    a.click();
  });
}

beforeEach(() => {
  pathname = "/";
  localStorage.clear();
  resetNavLogCache();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useNavigationTiming", () => {
  it("is pending from the tap until the route changes, then logs the navigation", async () => {
    const { result, rerender } = renderHook(() => useNavigationTiming());
    expect(result.current).toBe(false);
    tapLink("/conti");
    expect(result.current).toBe(true);
    pathname = "/conti";
    rerender();
    expect(result.current).toBe(false);
    await waitFor(() => expect(readNavLog()).toHaveLength(1));
    expect(readNavLog()[0]).toMatchObject({ path: "/conti", standalone: false });
  });

  it("gives up after the timeout when the route never changes", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useNavigationTiming());
    tapLink("/conti");
    expect(result.current).toBe(true);
    act(() => {
      vi.advanceTimersByTime(NAV_TIMEOUT_MS);
    });
    expect(result.current).toBe(false);
  });
});
