// Merchant words of a bank description: what stays once codes, dates and banking boilerplate are gone.
import { normalizeDescription } from "./dedup";

// Boilerplate of Italian bank exports (Cherry, Revolut, CBI): never identifies who was paid.
const NOISE = new Set(
  (
    "addebito accredito diretto core rcur sdd prg car pagamento pagamenti paesi del della dei valuta eur euro paese italia " +
    "carta circuito visa mastercard maestro bancomat pos com www bonifico sepa istantaneo disposto internet coor benef banca " +
    "destinataria data ordine regolamento cro favore vostro nostro operazione spa srl snc ita deu germania verso commissione " +
    "commissioni ricarica conto per con the and inc ltd gmbh"
  ).split(" "),
);

/** Distinct merchant tokens in order: letters only, at least 3 characters, no boilerplate or extra noise. */
export function merchantTokens(description: string, extraNoise: ReadonlySet<string> = EMPTY): string[] {
  const out: string[] = [];
  for (const t of normalizeDescription(description).split(" ")) {
    // BIC codes of the banks involved end with "XX"/"XXX" (e.g. TRBKITMMXXX).
    if (t.length < 3 || /\d/.test(t) || /xx$/.test(t) || NOISE.has(t) || extraNoise.has(t) || out.includes(t)) continue;
    out.push(t);
  }
  return out;
}

const EMPTY: ReadonlySet<string> = new Set();

/**
 * Words that sit next to many different merchants, like the account holder's name in every direct
 * debit ("ROSSI MARIO ... ACQUAGAS", "... LUCEPIU"): they describe the payer, not who was paid.
 */
export function findNoise(descriptions: string[], minContexts = 3): Set<string> {
  const contexts = new Map<string, Set<string>>();
  for (const d of descriptions) {
    const tokens = merchantTokens(d);
    for (const t of tokens) {
      const rest = tokens.filter((x) => x !== t).join(" ");
      if (!rest) continue;
      const set = contexts.get(t) ?? new Set<string>();
      set.add(rest);
      contexts.set(t, set);
    }
  }
  return new Set([...contexts].filter(([, set]) => set.size >= minContexts).map(([t]) => t));
}

/** Stable grouping key: the first three merchant tokens. Empty when nothing identifies the merchant. */
export function merchantKey(description: string, extraNoise?: ReadonlySet<string>): string {
  return merchantTokens(description, extraNoise).slice(0, 3).join(" ");
}

/** Tokens plus adjacent pairs joined, so "WIND TRE" also matches "WindTre". */
export function withCompounds(tokens: readonly string[]): string[] {
  return [...tokens, ...tokens.slice(1).map((t, i) => tokens[i] + t)];
}

/** Shared tokens over the shorter set (1 = one description contains the other). */
export function overlap(a: readonly string[], b: readonly string[]): number {
  if (!a.length || !b.length) return 0;
  const small = a.length <= b.length ? a : b;
  const large = new Set(a.length <= b.length ? b : a);
  return small.filter((t) => large.has(t)).length / small.length;
}

/** Title-cased label from merchant tokens, e.g. "netflix" -> "Netflix". */
export function merchantLabel(description: string, extraNoise?: ReadonlySet<string>): string {
  const key = merchantKey(description, extraNoise);
  return key ? key.replace(/\b\w/g, (c) => c.toUpperCase()) : description.trim().slice(0, 60);
}
