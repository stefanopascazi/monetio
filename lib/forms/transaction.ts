import type { ISODate, PaymentMethod } from "../domain/types";
import { Checker, isISODate, isUUID, optionalText, type ParseResult, positiveCents, text } from "./parse";

/** Kinds offered by the form: bonifico and CBill are expenses with an optional fee. */
export type TransactionFormKind = "income" | "expense" | "transfer" | PaymentMethod;
const FORM_KINDS: TransactionFormKind[] = ["income", "expense", "transfer", "bank_transfer", "cbill"];
const isPaymentMethod = (k: string): k is PaymentMethod => k === "bank_transfer" || k === "cbill";

export interface TransactionInput {
  kind: "income" | "expense" | "transfer";
  accountId: string;
  counterpartAccountId: string | null;
  categoryId: string | null;
  /** Signed for accountId. */
  amountCents: number;
  bookedOn: ISODate;
  description: string;
  notes: string | null;
  status: "booked" | "planned";
  paymentMethod: PaymentMethod | null;
  /** Optional fee of a bonifico/CBill, positive; booked as a separate expense row. */
  feeCents: number | null;
}

/** Validates the transaction form; future dates become planned unless booked is forced. */
export function parseTransactionForm(fd: FormData, today: ISODate): ParseResult<TransactionInput> {
  const formKind = text(fd, "kind") as TransactionFormKind;
  const paymentMethod = isPaymentMethod(formKind) ? formKind : null;
  const kind: TransactionInput["kind"] = paymentMethod ? "expense" : (formKind as TransactionInput["kind"]);
  const feeText = paymentMethod ? text(fd, "feeCents") : "";
  const feeCents = feeText ? positiveCents(feeText) : null;
  const accountId = text(fd, "accountId");
  const counterpart = text(fd, "counterpartAccountId");
  const categoryId = text(fd, "categoryId");
  const cents = positiveCents(text(fd, "amountCents"));
  const bookedOn = text(fd, "bookedOn");
  const description = text(fd, "description");

  const c = new Checker()
    .check(FORM_KINDS.includes(formKind), "kind", "Scegli il tipo di movimento")
    .check(isUUID(accountId), "accountId", "Scegli un conto")
    .check(cents !== null, "amountCents", "Inserisci un importo maggiore di zero")
    .check(isISODate(bookedOn), "bookedOn", "Inserisci una data valida")
    .check(description.length > 0 && description.length <= 200, "description", "Scrivi una descrizione")
    .check(!categoryId || isUUID(categoryId), "categoryId", "Categoria non valida")
    .check(!feeText || feeCents !== null, "feeCents", "Le spese devono essere maggiori di zero");
  if (kind === "transfer") {
    c.check(isUUID(counterpart), "counterpartAccountId", "Scegli il conto di destinazione").check(
      counterpart !== accountId,
      "counterpartAccountId",
      "Scegli un conto diverso da quello di partenza",
    );
  }

  const status = text(fd, "status") === "planned" || (isISODate(bookedOn) && bookedOn > today) ? "planned" : "booked";
  return c.result({
    kind,
    accountId,
    counterpartAccountId: kind === "transfer" ? counterpart : null,
    categoryId: categoryId || null,
    amountCents: kind === "income" ? (cents ?? 0) : -(cents ?? 0),
    bookedOn,
    description,
    notes: optionalText(fd, "notes"),
    status,
    paymentMethod,
    feeCents,
  });
}
