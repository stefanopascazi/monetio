import { describe, expect, it } from "vitest";
import { defaultAccountId, quickCreateOptions } from "./quick-create-options";

describe("quickCreateOptions", () => {
  it("offers everything when there are accounts", () => {
    expect(quickCreateOptions(true).map((o) => o.kind)).toEqual(["movement", "rule", "contribution", "account", "category"]);
  });
  it("offers only account and category without accounts", () => {
    expect(quickCreateOptions(false).map((o) => o.kind)).toEqual(["account", "category"]);
  });
});

describe("defaultAccountId", () => {
  it("prefers the open account", () => {
    expect(defaultAccountId(["a", "b"], "b")).toBe("b");
  });
  it("falls back to the first account", () => {
    expect(defaultAccountId(["a", "b"], "x")).toBe("a");
    expect(defaultAccountId(["a", "b"], undefined)).toBe("a");
  });
  it("returns empty without accounts", () => {
    expect(defaultAccountId([], undefined)).toBe("");
  });
});
