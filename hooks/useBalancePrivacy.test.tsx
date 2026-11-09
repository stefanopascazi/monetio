import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BALANCE_PRIVACY_ATTR, BALANCE_PRIVACY_STORAGE_KEY } from "@/lib/privacy/balance-privacy";
import { useBalancePrivacy } from "./useBalancePrivacy";

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute(BALANCE_PRIVACY_ATTR);
});

describe("useBalancePrivacy", () => {
  it("reads the attribute set before paint", () => {
    document.documentElement.setAttribute(BALANCE_PRIVACY_ATTR, "");
    const { result } = renderHook(() => useBalancePrivacy());
    expect(result.current.hidden).toBe(true);
  });

  it("toggle updates attribute, storage and every subscriber", () => {
    const a = renderHook(() => useBalancePrivacy());
    const b = renderHook(() => useBalancePrivacy());
    act(() => a.result.current.toggle());
    expect(document.documentElement.hasAttribute(BALANCE_PRIVACY_ATTR)).toBe(true);
    expect(localStorage.getItem(BALANCE_PRIVACY_STORAGE_KEY)).toBe("1");
    expect(b.result.current.hidden).toBe(true);
    act(() => b.result.current.toggle());
    expect(a.result.current.hidden).toBe(false);
  });
});
