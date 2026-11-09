import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BALANCE_PRIVACY_ATTR } from "@/lib/privacy/balance-privacy";
import { BalancePrivacyToggle } from "./BalancePrivacyToggle";

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute(BALANCE_PRIVACY_ATTR);
});

describe("BalancePrivacyToggle", () => {
  it("switches between hide and show", () => {
    render(<BalancePrivacyToggle />);
    const btn = screen.getByRole("button", { name: "Nascondi saldi" });
    expect(btn).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(btn);
    expect(screen.getByRole("button", { name: "Mostra saldi" })).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.hasAttribute(BALANCE_PRIVACY_ATTR)).toBe(true);
  });
});
