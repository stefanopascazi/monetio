import { describe, expect, it } from "vitest";
import { ownsRule, touchesVisible } from "./rule-visibility";

const visible = new Set(["joint"]);

describe("rule visibility", () => {
  it("owns only rules paid from a visible account", () => {
    expect(ownsRule({ accountId: "joint", counterpartAccountId: null }, visible)).toBe(true);
    expect(ownsRule({ accountId: "private", counterpartAccountId: "joint" }, visible)).toBe(false);
  });

  it("touches visible accounts through the counterpart too", () => {
    expect(touchesVisible({ accountId: "private", counterpartAccountId: "joint" }, visible)).toBe(true);
    expect(touchesVisible({ accountId: "joint", counterpartAccountId: null }, visible)).toBe(true);
    expect(touchesVisible({ accountId: "private", counterpartAccountId: null }, visible)).toBe(false);
    expect(touchesVisible({ accountId: "private", counterpartAccountId: "other" }, visible)).toBe(false);
  });
});
