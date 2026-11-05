import type { ISODate } from "../domain/types";
import { Checker, isISODate, optionalText, type ParseResult, positiveCents, text } from "./parse";

export interface OverrideInput {
  /** Positive cents; the sign comes from the rule. */
  amountCents: number;
  dueDate: ISODate;
  note: string | null;
}

export function parseOverrideForm(fd: FormData): ParseResult<OverrideInput> {
  const cents = positiveCents(text(fd, "amountCents"));
  const dueDate = text(fd, "dueDate");
  const note = optionalText(fd, "note");
  return new Checker()
    .check(cents !== null, "amountCents", "Inserisci un importo maggiore di zero")
    .check(isISODate(dueDate), "dueDate", "Inserisci la scadenza")
    .check(!note || note.length <= 200, "note", "Nota troppo lunga")
    .result({ amountCents: cents ?? 0, dueDate, note });
}

/** Rule id and period from a rule occurrence key (`r:<rule>|<period>`), or null. */
export function parseRuleKey(key: string): { ruleId: string; period: string } | null {
  const m = /^r:([0-9a-f-]{36})\|(\d{4}-\d{2}(?:-\d{2})?)$/i.exec(key);
  return m ? { ruleId: m[1], period: m[2] } : null;
}
