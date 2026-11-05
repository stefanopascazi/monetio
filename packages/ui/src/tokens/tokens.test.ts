import { describe, expect, it } from "vitest";
import { chartSeries, colors, radius, shadows, spacing, textStyles, tokenVar } from "./index";

const NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const HEX = /^#[0-9a-f]{6}$/;

// WCAG relative luminance contrast.
function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
const get = (name: string) => colors.find((c) => c.name === name)!;

describe("tokens", () => {
  it("have valid unique names and hex values in both themes", () => {
    const names = [...colors, ...spacing, ...radius, ...shadows].map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    names.forEach((n) => expect(n).toMatch(NAME));
    colors.forEach((c) => {
      expect(c.value.light).toMatch(HEX);
      expect(c.value.dark).toMatch(HEX);
      expect(c.usage.length).toBeGreaterThan(0);
    });
  });

  it.each(["light", "dark"] as const)("text colors meet 4.5:1 on surfaces in %s", (theme) => {
    const grounds = ["mio-bg", "mio-surface", "mio-surface-raised"];
    const texts = ["mio-ink", "mio-ink-muted", "mio-brand-ink", "mio-accent-ink", "mio-forecast-ink", "mio-income", "mio-expense", "mio-transfer", "mio-danger", "mio-warning", "mio-info"];
    for (const t of texts)
      for (const g of grounds) {
        expect(contrast(get(t).value[theme], get(g).value[theme]), `${t} on ${g}`).toBeGreaterThanOrEqual(4.5);
      }
    expect(contrast(get("mio-ink-subtle").value[theme], get("mio-surface").value[theme])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["light", "dark"] as const)("on-brand text and focus ring are legible in %s", (theme) => {
    expect(contrast(get("mio-on-brand").value[theme], get("mio-brand").value[theme])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(get("mio-on-accent").value[theme], get("mio-accent").value[theme])).toBeGreaterThanOrEqual(4.5);
    for (const [t, g] of [["mio-brand-ink", "mio-brand-soft"], ["mio-accent-ink", "mio-accent-soft"], ["mio-forecast-ink", "mio-forecast-soft"], ["mio-income", "mio-income-soft"], ["mio-expense", "mio-expense-soft"], ["mio-ink", "mio-brand-soft"], ["mio-ink-muted", "mio-accent-soft"], ["mio-ink-muted", "mio-forecast-soft"]])
      expect(contrast(get(t).value[theme], get(g).value[theme]), `${t} on ${g}`).toBeGreaterThanOrEqual(4.5);
    for (const g of ["mio-bg", "mio-surface", "mio-surface-raised"]) {
      expect(contrast(get("mio-focus").value[theme], get(g).value[theme])).toBeGreaterThanOrEqual(3);
      expect(contrast(get("mio-border-strong").value[theme], get(g).value[theme])).toBeGreaterThanOrEqual(3);
    }
  });

  it("exposes six chart series and var helper", () => {
    expect(chartSeries).toHaveLength(6);
    expect(tokenVar("mio-brand")).toBe("var(--mio-brand)");
    expect(tokenVar("mio-space-4")).toBe("var(--mio-space-4)");
    expect(() => tokenVar("brand")).toThrow();
  });

  it("text styles use known families", () => {
    textStyles.forEach((s) => expect(["display", "sans", "mono"]).toContain(s.family));
  });
});
