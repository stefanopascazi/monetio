import { describe, expect, it } from "vitest";
import { periodLabel } from "./period-label";

describe("periodLabel", () => {
  it("labels months and full or partial years", () => {
    expect(periodLabel({ key: "2026-11", current: true }).toLowerCase()).toBe("nov 2026");
    expect(periodLabel({ key: "2027", current: false, months: 12 })).toBe("2027");
    expect(periodLabel({ key: "2026", current: true, months: 2 })).toBe("2026 · 2 mesi");
    expect(periodLabel({ key: "2036", current: false, months: 1 })).toBe("2036 · 1 mese");
  });
});
