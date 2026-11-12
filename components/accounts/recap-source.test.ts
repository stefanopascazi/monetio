import { describe, expect, it } from "vitest";
import { isUsedUp, RECAP_SOURCE } from "./recap-source";

const usage = { totalCents: 6500, usedCents: 6500, parts: [] };

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
});
