// Enable Banking records turned into MonetIO's shape: signed cents, a date, a readable description,
// and a stable reference that makes every sync idempotent.
import type { ISODate } from "../../domain/types.ts";
import { normalizeIban } from "../identifiers.ts";
import type { AmountType, BalanceResource, TransactionResource } from "../enable-banking/types.ts";

export type BankMovement = {
  /** Stable per bank account: the bank's own reference when given, else a content hash. */
  ref: string;
  bookedOn: ISODate;
  /** Signed: negative = money out. */
  amountCents: number;
  description: string;
  counterpartyIban: string | null;
};

/** "12.34" → 1234, exact on strings (no floating point). Null when not a decimal amount. */
export function toCents(amount: string): number | null {
  const m = /^\s*(-?)(\d+)(?:[.,](\d{1,2})\d*)?\s*$/.exec(amount);
  if (!m) return null;
  const cents = Number(m[2]) * 100 + Number((m[3] ?? "").padEnd(2, "0"));
  return m[1] === "-" ? -cents : cents;
}

function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

function describe(t: TransactionResource, incoming: boolean): string {
  const remittance = (t.remittance_information ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
  const party = (incoming ? t.debtor?.name : t.creditor?.name)?.trim();
  // Many banks repeat the counterparty inside the remittance text.
  const showParty = party && !remittance.toLowerCase().includes(party.toLowerCase());
  const text = [showParty ? party : "", remittance].filter(Boolean).join(" · ") || t.note?.trim() || "Movimento bancario";
  return text.replace(/\s+/g, " ").slice(0, 300);
}

/** Booked transactions only; identical rows without a bank reference get an occurrence index. */
export function normalizeTransactions(items: TransactionResource[]): BankMovement[] {
  const seen = new Map<string, number>();
  const out: BankMovement[] = [];
  for (const t of items) {
    if (t.status && t.status !== "BOOK") continue;
    const date = t.booking_date ?? t.value_date ?? t.transaction_date;
    const abs = toCents(t.transaction_amount?.amount ?? "");
    if (!date || !ISO_DATE.test(date) || abs === null) continue;
    const incoming = t.credit_debit_indicator === "CRDT";
    const amountCents = incoming ? Math.abs(abs) : -Math.abs(abs);
    const description = describe(t, incoming);
    const bookedOn = date.slice(0, 10) as ISODate;
    const party = incoming ? t.debtor_account : t.creditor_account;
    let ref = t.entry_reference?.trim() || t.transaction_id?.trim() || "";
    if (!ref) {
      const key = `${bookedOn}|${amountCents}|${description.toLowerCase()}`;
      const n = seen.get(key) ?? 0;
      seen.set(key, n + 1);
      ref = `h${fnv(key)}:${n}`;
    }
    out.push({ ref: ref.slice(0, 120), bookedOn, amountCents, description, counterpartyIban: party?.iban ? normalizeIban(party.iban) : null });
  }
  return out;
}

const BALANCE_PREFERENCE = ["CLBD", "ITBD", "ITAV", "CLAV", "XPCD"];

/** The most "booked" balance offered by the bank, in cents. */
export function pickBalance(balances: BalanceResource[]): { cents: number; currency: string; date: ISODate | null } | null {
  const ranked = [...balances].sort((a, b) => rank(a.balance_type) - rank(b.balance_type));
  for (const b of ranked) {
    const cents = toCents((b.balance_amount as AmountType | undefined)?.amount ?? "");
    if (cents === null) continue;
    const date = b.reference_date && ISO_DATE.test(b.reference_date) ? (b.reference_date.slice(0, 10) as ISODate) : null;
    return { cents, currency: b.balance_amount.currency, date };
  }
  return null;
}

function rank(type?: string | null): number {
  const i = BALANCE_PREFERENCE.indexOf(type ?? "");
  return i === -1 ? BALANCE_PREFERENCE.length : i;
}
