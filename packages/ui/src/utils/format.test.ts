import { describe, expect, it } from "vitest";
import {
  daysUntil,
  formatMoney,
  formatPercent,
  formatShortDate,
  initials,
  parseMoneyInput,
  relativeDueLabel,
  splitMoney,
} from "./format";

describe("formatMoney", () => {
  it("formats cents in EUR with a true minus", () => {
    expect(formatMoney(123456)).toBe("€1,234.56");
    expect(formatMoney(-8240)).toBe("−€82.40");
  });

  it("supports always-sign, whole and compact", () => {
    expect(formatMoney(5000, { signDisplay: "always" })).toBe("+€50.00");
    expect(formatMoney(0, { signDisplay: "always" })).toBe("€0.00");
    expect(formatMoney(123456, { whole: true })).toBe("€1,235");
    expect(formatMoney(4_821_035_00, { compact: true })).toBe("€4.8M");
  });
});

describe("splitMoney", () => {
  it("splits whole and fraction", () => {
    expect(splitMoney(4821035)).toEqual({ whole: "€48,210", fraction: ".35" });
    expect(splitMoney(100, { whole: true })).toEqual({ whole: "€1", fraction: "" });
  });
});

describe("parseMoneyInput", () => {
  it.each([
    ["82.4", 8240],
    ["12,5", 1250],
    ["1,234.50", 123450],
    ["1.234,50", 123450],
    ["1,234", 123400],
    ["€ 950", 95000],
    ["-3", -300],
  ])("parses %s", (input, cents) => {
    expect(parseMoneyInput(input)).toBe(cents);
  });

  it("returns null for empty or invalid", () => {
    expect(parseMoneyInput("")).toBeNull();
    expect(parseMoneyInput("abc")).toBeNull();
  });
});

describe("dates", () => {
  const today = new Date(2026, 10, 5);
  it("computes days until", () => {
    expect(daysUntil(new Date(2026, 10, 7), today)).toBe(2);
    expect(daysUntil(new Date(2026, 10, 1), today)).toBe(-4);
  });

  it("labels relative due dates", () => {
    expect(relativeDueLabel(0)).toBe("Today");
    expect(relativeDueLabel(1)).toBe("Tomorrow");
    expect(relativeDueLabel(5)).toBe("In 5 days");
    expect(relativeDueLabel(-1)).toBe("1 day overdue");
    expect(relativeDueLabel(-3)).toBe("3 days overdue");
  });

  it("formats short dates with year only when different", () => {
    expect(formatShortDate(new Date(2026, 10, 3), "en-IE", today)).toBe("3 Nov");
    expect(formatShortDate(new Date(2025, 0, 9), "en-IE", today)).toBe("9 Jan 2025");
  });
});

describe("misc", () => {
  it("formats percent with sign", () => {
    expect(formatPercent(4.21)).toBe("+4.2%");
    expect(formatPercent(-1)).toBe("−1.0%");
    expect(formatPercent(0)).toBe("0.0%");
  });

  it("builds initials", () => {
    expect(initials("giulia rossi bianchi")).toBe("GR");
    expect(initials("Marco")).toBe("M");
  });
});
