// Fees of bonifico/CBill payments: default category lookup and labels.
import type { Category, PaymentMethod } from "./types";

export const PAYMENT_LABEL: Record<PaymentMethod, string> = { bank_transfer: "Bonifico", cbill: "CBill" };

const normalize = (s: string) => s.toLocaleLowerCase("it").normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Default category for fee rows: the first expense category named like "Commissioni ...". */
export function feeCategoryId(categories: Pick<Category, "id" | "name" | "kind">[]): string | null {
  return categories.find((c) => c.kind !== "income" && normalize(c.name).startsWith("commission"))?.id ?? null;
}

/** Description of the fee row of a payment, e.g. "Spese bonifico · Affitto". */
export const feeDescription = (method: PaymentMethod, description: string) =>
  `Spese ${method === "cbill" ? "CBill" : "bonifico"} · ${description}`.slice(0, 200);

export type FeeSync = "insert" | "update" | "delete" | "none";

/** What to do with the linked fee row when a payment is saved with `feeCents`. */
export function feeSync(hasFee: boolean, feeCents: number | null): FeeSync {
  if (feeCents) return hasFee ? "update" : "insert";
  return hasFee ? "delete" : "none";
}
