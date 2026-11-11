import { describe, expect, it } from "vitest";
import { accountParam, periodParam } from "./params";

describe("statistics params", () => {
  it("accepts known periods only, 6 months by default", () => {
    expect(periodParam("12")).toBe("12");
    expect(periodParam(["3", "6"])).toBe("3");
    expect(periodParam("7")).toBe("6");
    expect(periodParam(undefined)).toBe("6");
  });

  it("accepts visible accounts only", () => {
    expect(accountParam("a", ["a", "b"])).toBe("a");
    expect(accountParam("x", ["a"])).toBeNull();
    expect(accountParam(undefined, ["a"])).toBeNull();
  });
});
