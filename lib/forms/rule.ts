import { anchorDay } from "../domain/recurrence";
import type { ISODate, PaymentMethod, RuleFrequency, RuleSchedule } from "../domain/types";
import { Checker, isISODate, isUUID, type ParseResult, positiveCents, text } from "./parse";
import { parsePaymentKind } from "./payment";

export interface RuleInput {
  kind: "income" | "expense" | "transfer";
  accountId: string;
  counterpartAccountId: string | null;
  categoryId: string | null;
  description: string;
  amountCents: number;
  frequency: RuleFrequency;
  schedule: RuleSchedule;
  dayOfMonth: number;
  startDate: ISODate;
  endDate: ISODate | null;
  active: boolean;
  paymentMethod: PaymentMethod | null;
  /** Fee booked with each occurrence (positive, 0 = none). */
  feeCents: number;
}

const FREQUENCIES: RuleFrequency[] = ["weekly", "monthly", "bimonthly", "quarterly", "semiannual", "yearly"];
const SCHEDULES: RuleSchedule[] = ["auto", "due", "estimate"];

export function parseRuleForm(fd: FormData): ParseResult<RuleInput> {
  const { kind, paymentMethod, feeCents, kindValid, feeValid } = parsePaymentKind(fd);
  const accountId = text(fd, "accountId");
  const counterpart = text(fd, "counterpartAccountId");
  const categoryId = text(fd, "categoryId");
  const cents = positiveCents(text(fd, "amountCents"));
  const frequency = text(fd, "frequency") as RuleFrequency;
  const schedule = text(fd, "schedule") as RuleSchedule;
  const day = Number(text(fd, "dayOfMonth"));
  const startDate = text(fd, "startDate");
  const endDate = text(fd, "endDate");
  const description = text(fd, "description");

  const c = new Checker()
    .check(kindValid, "kind", "Scegli il tipo")
    .check(feeValid, "feeCents", "Le spese devono essere maggiori di zero")
    .check(isUUID(accountId), "accountId", "Scegli un conto")
    .check(cents !== null, "amountCents", "Inserisci un importo maggiore di zero")
    .check(FREQUENCIES.includes(frequency), "frequency", "Scegli la frequenza")
    .check(SCHEDULES.includes(schedule), "schedule", "Scegli come gestirla")
    .check(!(paymentMethod && schedule === "estimate"), "schedule", "Un bonifico o CBill non può essere una stima")
    .check(Number.isInteger(day) && day >= 1 && day <= 31, "dayOfMonth", "Giorno tra 1 e 31")
    .check(isISODate(startDate), "startDate", "Inserisci la data di inizio")
    .check(!endDate || (isISODate(endDate) && endDate >= startDate), "endDate", "La fine deve essere dopo l'inizio")
    .check(description.length > 0 && description.length <= 120, "description", "Scrivi una descrizione")
    .check(!categoryId || isUUID(categoryId), "categoryId", "Categoria non valida");
  if (kind === "transfer") {
    c.check(isUUID(counterpart) && counterpart !== accountId, "counterpartAccountId", "Scegli un conto di destinazione diverso");
  }

  return c.result({
    kind,
    accountId,
    counterpartAccountId: kind === "transfer" ? counterpart : null,
    categoryId: categoryId || null,
    description,
    amountCents: kind === "income" ? (cents ?? 0) : -(cents ?? 0),
    frequency,
    schedule,
    // Non-monthly rules are anchored on their first due date (start date): it sets month and day.
    dayOfMonth: frequency === "monthly" || !isISODate(startDate) ? day : anchorDay(startDate, day),
    startDate,
    endDate: endDate || null,
    active: text(fd, "active") !== "false",
    paymentMethod,
    feeCents: feeCents ?? 0,
  });
}
