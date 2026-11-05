import type { AccountType, ISODate, Visibility } from "../domain/types";
import { Checker, isISODate, optionalText, type ParseResult, text } from "./parse";

export interface AccountInput {
  name: string;
  institution: string | null;
  type: AccountType;
  visibility: Visibility;
  openingBalanceCents: number;
  openingDate: ISODate;
}

const TYPES: AccountType[] = ["checking", "savings", "investment", "card", "cash"];

export function parseAccountForm(fd: FormData): ParseResult<AccountInput> {
  const name = text(fd, "name");
  const type = text(fd, "type") as AccountType;
  const visibility = text(fd, "visibility") as Visibility;
  const opening = Number(text(fd, "openingBalanceCents") || "0");
  const sign = text(fd, "openingNegative") === "true" ? -1 : 1;
  const openingDate = text(fd, "openingDate");

  return new Checker()
    .check(name.length > 0 && name.length <= 60, "name", "Dai un nome al conto")
    .check(TYPES.includes(type), "type", "Scegli il tipo di conto")
    .check(visibility === "shared" || visibility === "private", "visibility", "Scegli chi può vederlo")
    .check(Number.isInteger(opening) && opening >= 0, "openingBalanceCents", "Saldo iniziale non valido")
    .check(isISODate(openingDate), "openingDate", "Inserisci la data del saldo iniziale")
    .result({ name, institution: optionalText(fd, "institution"), type, visibility, openingBalanceCents: sign * opening, openingDate });
}
