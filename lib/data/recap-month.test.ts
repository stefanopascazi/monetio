import { describe, expect, it } from "vitest";
import { recapMonth, recapNav } from "./recap-month";

const today = "2026-11-08";

describe("recapMonth", () => {
  it("defaults to the current month and ignores invalid values", () => {
    expect(recapMonth(undefined, today)).toBe("2026-11");
    expect(recapMonth("nope", today)).toBe("2026-11");
  });

  it("keeps a month inside the window and clamps the others", () => {
    expect(recapMonth("2027-03", today)).toBe("2027-03");
    expect(recapMonth("2026-01", today)).toBe("2026-11");
    expect(recapMonth("2030-01", today)).toBe("2027-10");
  });
});

describe("recapNav", () => {
  it("stops at the current month and at the end of the window", () => {
    expect(recapNav("2026-11", today)).toEqual({ prev: null, next: "2026-12" });
    expect(recapNav("2027-10", today)).toEqual({ prev: "2027-09", next: null });
  });
});
