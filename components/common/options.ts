// Select options and Italian labels shared by forms.
import type { SelectOption } from "@monetio/ui";
import type { AccountType, RuleFrequency, RuleSchedule } from "@/lib/domain/types";

export interface NamedRef {
  id: string;
  name: string;
}

export const toOptions = (items: NamedRef[]): SelectOption[] => items.map((i) => ({ value: i.id, label: i.name }));

export const FREQUENCY_LABEL: Record<RuleFrequency, string> = {
  weekly: "Settimanale",
  monthly: "Mensile",
  bimonthly: "Bimestrale",
  quarterly: "Trimestrale",
  semiannual: "Semestrale",
  yearly: "Annuale",
};

export const SCHEDULE_LABEL: Record<RuleSchedule, string> = {
  auto: "Automatica",
  due: "A scadenza",
  estimate: "Solo stima",
};

export const SCHEDULE_HINT: Record<RuleSchedule, string> = {
  auto: "Registrata da sola alla data prevista (es. stipendio, mutuo, addebiti diretti)",
  due: "Compare tra le scadenze finché non la segni come pagata (es. bollette)",
  estimate: "Usata solo nelle proiezioni, non crea movimenti (es. budget spesa)",
};

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  checking: "Conto corrente",
  savings: "Risparmio",
  investment: "Investimenti",
  card: "Carta di credito",
  cash: "Contanti",
};

export const enumOptions = <T extends string>(labels: Record<T, string>): SelectOption[] =>
  (Object.keys(labels) as T[]).map((k) => ({ value: k, label: labels[k] }));
