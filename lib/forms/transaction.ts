import type { ISODate, PaymentMethod } from "../domain/types";
import { Checker, isISODate, isUUID, optionalText, type ParseResult, positiveCents, text } from "./parse";
import { parsePaymentKind } from "./payment";

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
  /** Optional fee of a bonifico/CBill/transfer, positive; booked as a separate expense row. */
  feeCents: number | null;
}

/** Validates the transaction form; future dates become planned unless booked is forced. */
export function parseTransactionForm(fd: FormData, today: ISODate): ParseResult<TransactionInput> {
  const { kind, paymentMethod, feeCents, kindValid, feeValid } = parsePaymentKind(fd);
  const accountId = text(fd, "accountId");
  const counterpart = text(fd, "counterpartAccountId");
  const categoryId = text(fd, "categoryId");
  const cents = positiveCents(text(fd, "amountCents"));
  const bookedOn = text(fd, "bookedOn");
  const description = text(fd, "description");

  const c = new Checker()
    .check(kindValid, "kind", "Scegli il tipo di movimento")
    .check(isUUID(accountId), "accountId", "Scegli un conto")
    .check(cents !== null, "amountCents", "Inserisci un importo maggiore di zero")
    .check(isISODate(bookedOn), "bookedOn", "Inserisci una data valida")
    .check(description.length > 0 && description.length <= 200, "description", "Scrivi una descrizione")
    .check(!categoryId || isUUID(categoryId), "categoryId", "Categoria non valida")
    .check(feeValid, "feeCents", "Le spese devono essere maggiori di zero");
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
