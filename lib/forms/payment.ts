// Shared parsing of the movement kind, where bonifico/CBill are expenses with an optional fee.
import type { PaymentMethod } from "../domain/types";
import { positiveCents, text } from "./parse";

/** Kinds offered by movement and rule forms. */
export type MovementFormKind = "income" | "expense" | "transfer" | PaymentMethod;
const FORM_KINDS: MovementFormKind[] = ["income", "expense", "transfer", "bank_transfer", "cbill"];

export const isPaymentMethod = (k: string): k is PaymentMethod => k === "bank_transfer" || k === "cbill";

export interface PaymentKind {
  kind: "income" | "expense" | "transfer";
  paymentMethod: PaymentMethod | null;
  /** Positive fee cents; null when empty or not a payment. */
  feeCents: number | null;
  kindValid: boolean;
  /** False when a fee was typed but is not a positive amount. */
  feeValid: boolean;
}

/** Reads `kind` and, for bonifico/CBill, the optional `feeCents` field. */
export function parsePaymentKind(fd: FormData): PaymentKind {
  const formKind = text(fd, "kind");
  const paymentMethod = isPaymentMethod(formKind) ? formKind : null;
  const feeText = paymentMethod ? text(fd, "feeCents") : "";
  const feeCents = feeText ? positiveCents(feeText) : null;
  return {
    kind: paymentMethod ? "expense" : (formKind as PaymentKind["kind"]),
    paymentMethod,
    feeCents,
    kindValid: FORM_KINDS.includes(formKind as MovementFormKind),
    feeValid: !feeText || feeCents !== null,
  };
}

/** Optional `feeCents` field: positive cents, 0 when empty, undefined when invalid. */
export function feeFromForm(fd: FormData): number | undefined {
  const raw = text(fd, "feeCents");
  if (!raw) return 0;
  return positiveCents(raw) ?? undefined;
}

/** Form kind to preselect when editing a saved movement or rule. */
export const formKindOf = (kind: "income" | "expense" | "transfer", paymentMethod: PaymentMethod | null): MovementFormKind => paymentMethod ?? kind;
