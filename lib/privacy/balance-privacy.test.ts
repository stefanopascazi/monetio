import { afterEach, describe, expect, it } from "vitest";
import {
  BALANCE_PRIVACY_ATTR,
  BALANCE_PRIVACY_STORAGE_KEY,
  applyBalancesHidden,
  balancePrivacyInitScript,
  isBalancesHidden,
  readBalancesHidden,
  writeBalancesHidden,
} from "./balance-privacy";

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute(BALANCE_PRIVACY_ATTR);
});

describe("balance privacy", () => {
  it("defaults to visible", () => {
    expect(readBalancesHidden()).toBe(false);
  });

  it("round-trips the preference and clears the key when visible", () => {
    writeBalancesHidden(true);
    expect(localStorage.getItem(BALANCE_PRIVACY_STORAGE_KEY)).toBe("1");
    expect(readBalancesHidden()).toBe(true);
    writeBalancesHidden(false);
    expect(localStorage.getItem(BALANCE_PRIVACY_STORAGE_KEY)).toBeNull();
  });

  it("never throws when storage is blocked", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readBalancesHidden(blocked)).toBe(false);
    expect(() => writeBalancesHidden(true, blocked)).not.toThrow();
  });

  it("toggles the root attribute", () => {
    applyBalancesHidden(true);
    expect(isBalancesHidden()).toBe(true);
    applyBalancesHidden(false);
    expect(isBalancesHidden()).toBe(false);
  });

  it("init script applies the stored preference", () => {
    localStorage.setItem(BALANCE_PRIVACY_STORAGE_KEY, "1");
    new Function(balancePrivacyInitScript)();
    expect(isBalancesHidden()).toBe(true);
  });
});
