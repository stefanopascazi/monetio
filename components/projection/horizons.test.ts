import { describe, expect, it } from "vitest";
import { horizonParam } from "./horizons";

describe("horizonParam", () => {
  it("accepts known horizons and defaults to 12", () => {
    expect(horizonParam("36")).toBe("36");
    expect(horizonParam(["6"])).toBe("6");
    expect(horizonParam("99")).toBe("12");
    expect(horizonParam(undefined)).toBe("12");
  });
});
