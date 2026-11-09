import { describe, expect, it } from "vitest";
import { formatCentsPlain } from "./format";

describe("formatCentsPlain", () => {
  it("formats signed cents the Italian way", () => {
    expect(formatCentsPlain(-18000)).toBe("-180,00");
    expect(formatCentsPlain(123456)).toBe("+1234,56");
  });
});
