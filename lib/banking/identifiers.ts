// Bank identifiers of an account (IBAN, BIC, card last digits): normalisation, validation,
// masking and extraction from statement descriptions. Never log the values handled here.

/** IBAN length per country (SEPA area and neighbours); unknown countries are rejected. */
const IBAN_LENGTH: Record<string, number> = {
  AD: 24, AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18, EE: 20, ES: 24, FI: 18,
  FR: 27, GB: 22, GI: 23, GR: 27, HR: 21, HU: 28, IE: 22, IS: 26, IT: 27, LI: 21, LT: 20, LU: 20,
  LV: 21, MC: 27, MT: 31, NL: 18, NO: 15, PL: 28, PT: 25, RO: 24, SE: 24, SI: 19, SK: 24, SM: 27, VA: 22,
};

/** Uppercase, no spaces or dots: the stored form. */
export function normalizeIban(raw: string): string {
  return raw.toUpperCase().replace(/[\s.\-]/g, "");
}

/** ISO 13616 check: known country length and mod 97 = 1. Expects a normalised IBAN. */
export function isValidIban(iban: string): boolean {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban) || IBAN_LENGTH[iban.slice(0, 2)] !== iban.length) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  // Letters become 10..35; the remainder is computed digit by digit to stay within safe integers.
  let rest = 0;
  for (const ch of rearranged) {
    const digits = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const d of digits) rest = (rest * 10 + Number(d)) % 97;
  }
  return rest === 1;
}

/** "IT60 •••• 2345": country, check digits and last 4 characters only. */
export function maskIban(iban: string): string {
  return `${iban.slice(0, 4)} •••• ${iban.slice(-4)}`;
}

export function normalizeBic(raw: string): string {
  return raw.toUpperCase().replace(/\s/g, "");
}

export function isValidBic(bic: string): boolean {
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic);
}

/** "1234, 5678 1234" -> ["1234", "5678"]; null when any entry is not 4 digits. */
export function parseCardLast4(raw: string): string[] | null {
  const parts = raw.split(/[\s,;]+/).filter(Boolean);
  if (parts.some((p) => !/^\d{4}$/.test(p))) return null;
  return [...new Set(parts)];
}

// Country code + check digits, then letters/digits optionally grouped by spaces (e.g. "IT60 X054 2811 ...").
const IBAN_START_RE = /\b([A-Z]{2})\s?(\d{2})((?:\s?[A-Z0-9]){10,32})/g;

/** Valid IBANs found in a description, in order, without repeats. */
export function extractIbans(text: string): string[] {
  const out: string[] = [];
  const upper = text.toUpperCase();
  const re = new RegExp(IBAN_START_RE.source, "g");
  for (let m = re.exec(upper); m; m = re.exec(upper)) {
    const length = IBAN_LENGTH[m[1]];
    // The match may run into the next words: keep exactly the country's length.
    const iban = length ? normalizeIban(m[0]).slice(0, length) : "";
    if (iban.length === length && isValidIban(iban)) {
      if (!out.includes(iban)) out.push(iban);
      re.lastIndex = m.index + endOfChars(m[0], length);
    } else re.lastIndex = m.index + 1;
  }
  return out;
}

/** Offset in `s` right after its first `n` non-space characters. */
function endOfChars(s: string, n: number): number {
  let seen = 0;
  for (let i = 0; i < s.length; i++) if (!/\s/.test(s[i]) && ++seen === n) return i + 1;
  return s.length;
}

// "Ricarica di *1234", "carta ****1234", "CARTA N. 123456******1234".
const CARD_RE = /\*+\s?(\d{4})\b/g;

/** Last 4 card digits found in a description, without repeats. */
export function extractCardLast4(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(CARD_RE)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}
