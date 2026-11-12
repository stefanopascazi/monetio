import { describe, expect, it } from "vitest";
import { isExceeded, isUsedUp, RECAP_SOURCE } from "./recap-source";

const usage = { totalCents: 6500, usedCents: 6500, overCents: 0, parts: [] };

describe("recap-source", () => {
  it("badges only projected sources", () => {
    expect(RECAP_SOURCE.booked).toBeNull();
    expect(RECAP_SOURCE.estimate?.label).toBe("stima");
  });

  it("marks a decreasing estimate used up only at zero", () => {
    expect(isUsedUp({ usage, amountCents: 0 })).toBe(true);
    expect(isUsedUp({ usage, amountCents: -100 })).toBe(false);
    expect(isUsedUp({ amountCents: 0 })).toBe(false);
  });

  it("marks an estimate exceeded only with overflow", () => {
    expect(isExceeded({ usage })).toBe(false);
    expect(isExceeded({ usage: { ...usage, overCents: 1 } })).toBe(true);
    expect(isExceeded({})).toBe(false);
  });
});
