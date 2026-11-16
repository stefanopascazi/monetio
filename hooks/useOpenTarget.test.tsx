import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { openTargetId, useOpenTarget } from "./useOpenTarget";

describe("useOpenTarget", () => {
  it("starts closed without a target", () => {
    const { result } = renderHook(() => useOpenTarget());
    expect(result.current[0]).toEqual([]);
  });

  it("opens the target and scrolls its marker into view", () => {
    const el = document.createElement("span");
    el.id = openTargetId("r1");
    el.scrollIntoView = vi.fn();
    document.body.appendChild(el);
    const { result } = renderHook(() => useOpenTarget("r1"));
    expect(result.current[0]).toEqual(["r1"]);
    expect(el.scrollIntoView).toHaveBeenCalledWith({ block: "center" });
    el.remove();
  });
});
