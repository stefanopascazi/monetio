// Parses the inline sums used in the sheet (e.g. "=-17.4-100-9.3+13.61" or "=-(267+2.5)").

/**
 * Returns the signed addends of a pure-number formula, or null when the formula references
 * cells or functions. A leading "-(...)" negates the whole group.
 */
export function parseAddends(formula: string): number[] | null {
  let expr = formula.trim().replace(/^=/, "").replace(/\s+/g, "");
  if (!expr || /[A-Za-z$!:]/.test(expr)) return null;
  let sign = 1;
  const group = expr.match(/^([+-]?)\((.*)\)$/);
  if (group) {
    sign = group[1] === "-" ? -1 : 1;
    expr = group[2];
  }
  if (/[()*/]/.test(expr)) return null;
  const parts = expr.match(/[+-]?[^+-]+/g);
  if (!parts) return null;
  const nums = parts.map((p) => Number(p.replace(/^\+/, "")));
  if (nums.some((n) => !Number.isFinite(n))) return null;
  return nums.map((n) => n * sign);
}

/** True when the formula has no cell references (a constant written as a formula). */
export function isConstantFormula(formula: string | undefined): boolean {
  return formula === undefined || parseAddends(formula) !== null;
}

const fmt = new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Human note listing the addends, only when there is more than one. */
export function addendsNote(formula: string | undefined): string | null {
  if (!formula) return null;
  const parts = parseAddends(formula);
  if (!parts || parts.length < 2) return null;
  return `Dettaglio: ${parts.map((n) => fmt.format(n)).join(" · ")}`;
}
