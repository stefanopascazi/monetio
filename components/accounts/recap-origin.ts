// Where a "Da contabilizzare" row comes from, in words, with a link to manage its source.
import type { BadgeTone } from "@monetio/ui";
import { recurrenceSummary } from "@/components/rules/recurrence-summary";
import { dateLabel } from "@/lib/domain/dates";
import type { RecapItem } from "@/lib/domain/month-recap";
import type { ContributionRule, PaymentMethod, RecurringRule, RuleSchedule } from "@/lib/domain/types";

/** Serializable source of a recap row: a recurring rule or a contribution. */
export interface RecapRule {
  id: string;
  type: "rule" | "contribution";
  description: string;
  /** Null for contributions. */
  schedule: RuleSchedule | null;
  /** E.g. "Ogni mese il giorno 15". */
  recurrence: string;
  kind: "income" | "expense" | "transfer";
  paymentMethod: PaymentMethod | null;
  feeCents: number;
}

/** Sources of the recap rows by id (rule and contribution ids are distinct uuids). */
export function recapRules(rules: RecurringRule[], contributions: ContributionRule[]): Record<string, RecapRule> {
  const out: Record<string, RecapRule> = {};
  for (const r of rules) {
    out[r.id] = {
      id: r.id,
      type: "rule",
      description: r.description,
      schedule: r.schedule,
      recurrence: recurrenceSummary(r.frequency, r.startDate, r.dayOfMonth),
      kind: r.kind,
      paymentMethod: r.paymentMethod,
      feeCents: r.feeCents,
    };
  }
  for (const c of contributions) {
    out[c.id] = {
      id: c.id,
      type: "contribution",
      description: c.description,
      schedule: null,
      recurrence: recurrenceSummary("monthly", c.startDate, c.dayOfMonth),
      kind: "transfer",
      paymentMethod: null,
      feeCents: 0,
    };
  }
  return out;
}

/** Scadenze page with the source open in its tab. */
export const originHref = (r: Pick<RecapRule, "id" | "type">) => `/scadenze?sezione=${r.type === "rule" ? "ricorrenze" : "quote"}&apri=${r.id}`;

/** Badge telling at a glance how a rule row gets booked. */
export function originTag(item: Pick<RecapItem, "source">, rule?: Pick<RecapRule, "schedule">): { label: string; tone: BadgeTone } | null {
  if (item.source !== "rule" || !rule) return null;
  if (rule.schedule === "due") return { label: "scadenza", tone: "neutral" };
  if (rule.schedule === "auto") return { label: "automatico", tone: "neutral" };
  return null;
}

/** One sentence on where the row comes from and how it will be booked. */
export function originText(item: Pick<RecapItem, "source" | "date" | "occurrence" | "ref">, rule?: RecapRule, createdByName?: string | null): string {
  const when = dateLabel(item.date);
  if (item.source === "planned") {
    const by = createdByName ? ` inserito da ${createdByName}` : "";
    return `Movimento singolo pianificato${by}: si registra da solo il ${when}. Puoi registrarlo prima, modificarlo o eliminarlo qui.`;
  }
  if (!rule) return "Movimento previsto da una regola non più visibile.";
  const name = `«${rule.description}» · ${rule.recurrence}`;
  if (rule.type === "contribution") return `Quota ${name}. Registrala quando fai il trasferimento.`;
  if (item.source === "estimate") return `Stima ${name}. Registra la spesa reale o elimina quanto resta.`;
  // Rule rows without an occurrence key are the fee booked with each payment.
  if (!item.ref) return `Spese della ricorrenza ${name}: si registrano insieme al pagamento.`;
  if (rule.schedule === "auto") return `Ricorrenza automatica ${name}. Si registra da sola il ${when}.`;
  return `Ricorrenza a scadenza ${name}. Non si registra da sola: usa «Registra pagamento» quando paghi.`;
}
