// Reliability shown next to a projection series: the household's for all accounts, the account's otherwise.
import type { Reliability, ReliabilityLevel, ReliabilitySuggestion } from "@/lib/domain/reliability";

export type ReliabilityData = Pick<Reliability, "score" | "level" | "accounts" | "suggestions">;

export interface SeriesReliability {
  level: ReliabilityLevel;
  score: number;
  suggestions: ReliabilitySuggestion[];
  /** Names of the accounts whose movements come from the bank. */
  bankSynced: string[];
}

export function reliabilityFor(data: ReliabilityData, seriesId: string): SeriesReliability {
  const account = data.accounts.find((a) => a.accountId === seriesId);
  const synced = (account ? [account] : data.accounts).filter((a) => a.bankSynced).map((a) => a.name);
  if (!account) return { level: data.level, score: data.score, suggestions: data.suggestions, bankSynced: synced };
  return { level: account.level, score: account.score, suggestions: data.suggestions.filter((s) => s.accountId === seriesId), bankSynced: synced };
}
