import type { ISODate } from "../domain/types";
import { Checker, isISODate, type ParseResult, positiveCents, text } from "./parse";

export interface EstimateBookingInput {
  /** Positive cents; the sign comes from the rule. */
  amountCents: number;
  bookedOn: ISODate;
}

/** Amount and date of the movement an estimate remainder turns into (never in the future). */
export function parseEstimateBookingForm(fd: FormData, today: ISODate): ParseResult<EstimateBookingInput> {
  const cents = positiveCents(text(fd, "amountCents"));
  const bookedOn = text(fd, "bookedOn") || today;
  return new Checker()
    .check(cents !== null, "amountCents", "Inserisci un importo maggiore di zero")
    .check(isISODate(bookedOn), "bookedOn", "Inserisci una data valida")
    .check(!isISODate(bookedOn) || bookedOn <= today, "bookedOn", "La data non può essere nel futuro")
    .result({ amountCents: cents ?? 0, bookedOn });
}
