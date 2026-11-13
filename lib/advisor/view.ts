// Engine verdict turned into Italian UI lines: the numbers the user sees come from here, not from the model.
import { formatMoney } from "@monetio/ui";
import { dateLabel, monthLabel } from "../domain/dates";
import type { AdvisorContext } from "./context";
import type { AdvisorVerdict } from "./tools";

export type VerdictTone = "positive" | "warning" | "negative";

export interface VerdictView {
  title: string;
  tone: VerdictTone;
  /** Goal as understood by the engine, to spot a misread question. */
  goal: string;
  lines: string[];
}

const TITLE = { yes: "Sì", yes_if: "Sì, se…", no: "No" } as const;
const TONE: Record<AdvisorVerdict["outcome"], VerdictTone> = { yes: "positive", yes_if: "warning", no: "negative" };

export function verdictView(v: AdvisorVerdict, ctx: Pick<AdvisorContext, "accounts" | "categories">): VerdictView {
  const account = ctx.accounts.find((a) => a.id === v.goal.accountId)?.name ?? "conto";
  const category = (id: string) => ctx.categories.find((c) => c.id === id)?.name ?? "categoria";
  const lines: string[] = [];
  lines.push(`Punto più basso previsto: ${formatMoney(v.lowest.cents)} a fine ${monthLabel(v.lowest.month, true)}.`);
  if (v.shortfallCents > 0) lines.push(`Mancano ${formatMoney(v.shortfallCents)}.`);
  for (const n of v.negativeAccounts) {
    const name = ctx.accounts.find((a) => a.id === n.accountId)?.name ?? "Un conto";
    lines.push(`${name} andrebbe a ${formatMoney(n.lowest.cents)} a fine ${monthLabel(n.lowest.month, true)}.`);
  }
  if (v.tight) lines.push("Margine stretto: con dati incompleti il risultato può cambiare.");
  for (const l of v.levers) {
    if (l.kind === "postpone") lines.push(`Rimandando al ${dateLabel(l.date)}.`);
    else if (l.kind === "reduce") lines.push(`Spendendo al massimo ${formatMoney(l.amountCents, { whole: true })}.`);
    else if (l.kind === "save") lines.push(`Risparmiando ${formatMoney(l.monthlyCents, { whole: true })} in più al mese da oggi.`);
    else lines.push(`Tagliando ${category(l.categoryId)} del ${l.percent}% da oggi.`);
  }
  return {
    title: TITLE[v.outcome],
    tone: v.tight && v.outcome === "yes" ? "warning" : TONE[v.outcome],
    goal: `${v.goal.label}: ${formatMoney(v.goal.amountCents)} il ${dateLabel(v.goal.date)} da ${account}`,
    lines,
  };
}
