// How much the projection can be trusted: a 0-100 score per account and for the household, from how
// complete and fresh the declared data is, with the concrete actions that would raise it.
import { daysBetween } from "./dates";
import type { ISODate } from "./types";

export type ReliabilityLevel = "high" | "medium" | "low";

/** What the app knows about one account's data quality. */
export interface AccountFacts {
  accountId: string;
  name: string;
  /** Latest booked movement, null when there is none. */
  lastBookedOn: ISODate | null;
  /** Months with booked movements among the last 12. */
  historyMonths: number;
  /** Average booked spending of the last full months (positive cents). */
  avgMonthlyExpenseCents: number;
  /** Average monthly spending declared by rules, estimates and quotas (positive cents). */
  declaredMonthlyExpenseCents: number;
  /** Past deadlines still to pay. */
  overdueCount: number;
  /** Past estimates still open (neither booked nor closed). */
  openEstimates: number;
  /** Merchants paid in several months without a recurring rule. */
  missingRules: number;
}

export type SuggestionKind = "stale" | "history" | "coverage" | "overdue" | "estimates" | "rules";

export interface ReliabilitySuggestion {
  kind: SuggestionKind;
  accountId: string;
  message: string;
  /** Page where the corrective action happens. */
  href: string;
  /** Points the account would gain: suggestions are sorted by it. */
  gain: number;
}

export interface AccountReliability {
  accountId: string;
  name: string;
  score: number;
  level: ReliabilityLevel;
}

export interface Reliability {
  score: number;
  level: ReliabilityLevel;
  accounts: AccountReliability[];
  suggestions: ReliabilitySuggestion[];
}

export const LEVEL_LABEL: Record<ReliabilityLevel, string> = { high: "Alta", medium: "Media", low: "Bassa" };

export function levelOf(score: number): ReliabilityLevel {
  return score >= 75 ? "high" : score >= 50 ? "medium" : "low";
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many.replace("#", String(n)));

/** Penalties of one account, each with the suggestion that removes it. */
function penalties(f: AccountFacts, today: ISODate): ReliabilitySuggestion[] {
  const out: ReliabilitySuggestion[] = [];
  const add = (kind: SuggestionKind, gain: number, message: string, href: string) => gain > 0 && out.push({ kind, accountId: f.accountId, message, href, gain });
  const account = `/conti/${f.accountId}`;

  const age = f.lastBookedOn ? daysBetween(f.lastBookedOn, today) : null;
  const stale = age === null || age > 30 ? 40 : age > 14 ? 25 : age > 7 ? 10 : 0;
  add(
    "stale",
    stale,
    age === null ? `Aggiorna ${f.name}: nessun movimento registrato` : `Aggiorna ${f.name}: ultimo movimento ${plural(age, "ieri", "# giorni fa")}`,
    "/dati/importa",
  );

  add("history", f.historyMonths >= 6 ? 0 : f.historyMonths >= 3 ? 10 : 20, `Importa lo storico di ${f.name}: ${plural(f.historyMonths, "1 mese", "# mesi")} di movimenti su 6 consigliati`, "/dati/importa");

  if (f.avgMonthlyExpenseCents > 0) {
    const coverage = Math.min(1, f.declaredMonthlyExpenseCents / f.avgMonthlyExpenseCents);
    const pct = Math.round(coverage * 100);
    add("coverage", coverage >= 0.8 ? 0 : coverage >= 0.5 ? 10 : 20, `Spesa media di ${f.name} coperta dalle regole: ${pct}%. Aggiungi le spese ricorrenti o una stima`, "/scadenze");
  }

  add("overdue", Math.min(15, 5 * f.overdueCount), `${plural(f.overdueCount, "1 scadenza passata", "# scadenze passate")} da saldare su ${f.name}`, "/scadenze");
  add("estimates", Math.min(10, 5 * f.openEstimates), `${plural(f.openEstimates, "1 stima aperta", "# stime aperte")} su ${f.name}: registra la spesa o chiudila`, account);
  add("rules", Math.min(15, 5 * f.missingRules), `${plural(f.missingRules, "1 spesa ricorrente", "# spese ricorrenti")} senza regola su ${f.name}: crea la regola dalle Scadenze`, "/scadenze");
  return out;
}

/**
 * Score per account (100 minus its penalties) and for the household (mean of the accounts, so a
 * forgotten account weighs as much as a busy one). Suggestions come sorted by the points they add.
 */
export function assessReliability(facts: AccountFacts[], today: ISODate): Reliability {
  const suggestions: ReliabilitySuggestion[] = [];
  const accounts = facts.map((f) => {
    const own = penalties(f, today);
    suggestions.push(...own);
    const score = Math.max(0, 100 - own.reduce((s, p) => s + p.gain, 0));
    return { accountId: f.accountId, name: f.name, score, level: levelOf(score) };
  });
  const score = accounts.length ? Math.round(accounts.reduce((s, a) => s + a.score, 0) / accounts.length) : 0;
  suggestions.sort((a, b) => b.gain - a.gain);
  return { score, level: levelOf(score), accounts, suggestions };
}

/** Share of a month's average spending the balance may drift by, per level, after one month. */
const DRIFT: Record<ReliabilityLevel, number> = { high: 0.1, medium: 0.2, low: 0.35 };

/**
 * Uncertainty of the projected balance `monthsAhead` months out (1 = current month end): it grows with
 * the square root of the horizon, as independent monthly errors add up.
 */
export function uncertaintyCents(avgMonthlyExpenseCents: number, level: ReliabilityLevel, monthsAhead: number): number {
  if (monthsAhead <= 0 || avgMonthlyExpenseCents <= 0) return 0;
  return Math.round(avgMonthlyExpenseCents * DRIFT[level] * Math.sqrt(monthsAhead));
}

/** What an account's projection margin is built from. */
export interface UncertaintyBand {
  avgMonthlyExpenseCents: number;
  level: ReliabilityLevel;
}

/** Margin of the summed balance of `ids`, `monthsAhead` months out: the accounts' margins add up. */
export function combinedUncertainty(bands: Record<string, UncertaintyBand>, ids: string[], monthsAhead: number): number {
  return ids.reduce((s, id) => s + (bands[id] ? uncertaintyCents(bands[id].avgMonthlyExpenseCents, bands[id].level, monthsAhead) : 0), 0);
}
