// Fees of bonifico/CBill payments and transfers: default category lookup and labels.
import type { Category, PaymentMethod } from "./types";

export const PAYMENT_LABEL: Record<PaymentMethod, string> = { bank_transfer: "Bonifico", cbill: "CBill" };

/** Movements that can carry a bank fee: bonifico/CBill payments and transfers (giroconti). */
export type FeeSource = PaymentMethod | "transfer";

export const FEE_SOURCE_LABEL: Record<FeeSource, string> = { ...PAYMENT_LABEL, transfer: "Giroconto" };

/** Fee source of a movement or rule; null when it cannot carry a fee. */
export const feeSource = (kind: string, paymentMethod: PaymentMethod | null | undefined): FeeSource | null =>
  paymentMethod ?? (kind === "transfer" ? "transfer" : null);

const normalize = (s: string) => s.toLocaleLowerCase("it").normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Default category for fee rows: the first expense category named like "Commissioni ...". */
export function feeCategoryId(categories: Pick<Category, "id" | "name" | "kind">[]): string | null {
  return categories.find((c) => c.kind !== "income" && normalize(c.name).startsWith("commission"))?.id ?? null;
}

const FEE_NOUN: Record<FeeSource, string> = { bank_transfer: "bonifico", cbill: "CBill", transfer: "giroconto" };

/** Description of the fee row of a payment, e.g. "Spese bonifico · Affitto". */
export const feeDescription = (source: FeeSource, description: string) => `Spese ${FEE_NOUN[source]} · ${description}`.slice(0, 200);

export type FeeSync = "insert" | "update" | "delete" | "none";

/** What to do with the linked fee row when a payment is saved with `feeCents`. */
export function feeSync(hasFee: boolean, feeCents: number | null): FeeSync {
  if (feeCents) return hasFee ? "update" : "insert";
  return hasFee ? "delete" : "none";
}
