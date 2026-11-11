// Account columns and errors shared by the create and update actions.
import type { AccountInput } from "../forms/account";

/** Bank identifier columns; the IBAN is written only when the form changed it. */
export function identifierColumns(v: Pick<AccountInput, "iban" | "bic" | "cardLast4">) {
  return { ...(v.iban !== undefined ? { iban: v.iban } : {}), bic: v.bic, card_last4: v.cardLast4 };
}

/** A repeated IBAN becomes a field error, so the generic mapper never logs a value-bearing message. */
export function accountFieldError(error: { code?: string; message?: string }): Record<string, string> | null {
  if (error.code === "23505" && /accounts_household_iban/.test(error.message ?? "")) return { iban: "Questo IBAN è già su un altro conto del nucleo" };
  return null;
}
